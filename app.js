const fileInput = document.getElementById("fileInput");
const parseButton = document.getElementById("generateBtn");
const downloadButton = document.getElementById("downloadBtn");
const preview = document.getElementById("preview");
const output = document.getElementById("output");
let downloadFileName = "";
let parsedOutput = "";
preview.textContent = "  Nothing to show yet!";

parseButton.addEventListener("click", async () => {

    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file");
        return;
    }
    downloadFileName = fileInput.files[0].name.slice(0, -4); 

    const tsvText = await file.text();
    const lineVals = parseTSV(tsvText);
    parsedOutput = formatLines(lineVals);

    preview.textContent = parsedOutput.substring(0, 200) + "...";
    output.textContent = parsedOutput;
});

downloadButton.addEventListener("click", async () => {
    downloadFile(parsedOutput, downloadFileName);
});

class ScriptLine {
    constructor(
        section,
        bgm,
        sfx,
        bg,
        transition,
        sprite,
        mvmt,
        base,
        emot,
        pos,
        speaker,
        text,
        cg,
        notes
    ) {
        this.section = section;
        this.bgm = bgm;
        this.sfx = sfx;
        this.bg = bg;
        this.transition = transition;
        this.sprite = sprite;
        this.mvmt = mvmt;
        this.base = base;
        this.emot = emot;
        this.pos = pos;
        this.speaker = speaker;
        this.text = text;
        this.cg = cg;
        this.notes = notes;
    }
}


// class ScriptLine {
//     constructor(data) {
//         Object.assign(this, data);
//     }
// }


function parseTSV(text) {
    text = text.replace(/\r/g, "");
    const lines = text.trim().split("\n");
    const headers = lines[0].split("\t");
    const lineVals = [];

    // console.log(`${headers}`);
    // for each row(line), make a new ScriptLine object and push into array lineVals
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split("\t");
        const row = new ScriptLine(
            values[0]  ?? "",
            values[1]  ?? "",
            values[2]  ?? "",
            values[3]  ?? "",
            values[4]  ?? "",
            values[5]  ?? "",
            values[6]  ?? "",
            values[7]  ?? "",
            values[8]  ?? "",
            values[9]  ?? "",
            values[10] ?? "",
            values[11] ?? "",
            values[12] ?? "",
            values[13] ?? ""
        );
        lineVals.push(row);
    }
    return lineVals;
}

function formatSection(section) {
    console.log(`Formatting SECTION: ${section}`)
    const formatted = `# SECTION: ${section.trim()}\n`
    return formatted;
}

function formatBGM(bgm) {
    console.log(`Formatting BGM: ${bgm}`);
    if (bgm.trim() == "stop") {
        return "stop music fadeout 2.0\n";
    }
    const formatted = `play music "audio/${bgm.trim()}" fadein 2.0\n`;
    return formatted;
}

function formatSFX(sfx) {
    console.log(`Formatting SFX: ${sfx}`);
    const formatted = `play sound "audio/${sfx.trim()}"\n`;
    return formatted;
}

function formatBCG(img) {
    console.log(`Formatting BG/CG: ${img}`);
    const formatted = `scene ${img.trim()} with fade\n`;
    return formatted;
}

function formatSprite(transition, spritechar, mvmt, base, emot, pos, lineNum, branch) {
    console.log(`Formatting SPRITE: ${spritechar}`);
    let formatted = "";
    // transitions:
    // fade in character: show [char at position] with dissolve
    // fade out character: hide [char] with dissolve
    // move character: hide [char] with dissolve, show [char at position] with dissolve

    // transition: need to split if comma, need to find char if parenthesis
    const tr = transition.trim();
    const splitTrans = tr.split(",");
    let middle = [];
    if (spritechar.length != 0) {
        middle = setSprite(spritechar, mvmt, base, emot, pos);
        console.log(`Middle has been set with length ${middle.length}`);
    }
    for (let i = 0; i < splitTrans.length; i++) {
        let curr = splitTrans[i];
        let currChara = findChara(curr);
        if (currChara.length == 0) {
            currChara = spritechar.trim();
        }
        console.log(`Found character: ${currChara}`);
        let prefix = "";
        let suffix = "";
        if (curr.includes("in")){
            // fade in
            prefix = "show";
            suffix = "with dissolve";
        }
        else if (curr.includes("out")) {
            // fade out
            prefix = "hide";
            suffix = "with dissolve";
        }
        else if (curr.includes("move")){
            // move
            prefix = `hide ${currChara} with dissolve\n`;
            if (branch) {prefix += "        ";}
            prefix += "show";
            suffix = "with dissolve";
        }
        else {
            // no transition
            prefix = "show";
            console.log("No transition!!");
        }
        let charaIndex = -1;
        if (middle.length == 1) {
            charaIndex = 0;
        }
        else {
            for (let j = 0; j < middle.length; j++) {
                const curr = middle[j];
                console.log(`MULTIPLE SPRITES IN LINE ${lineNum}: looking for ${currChara}, curr is ${curr} at j=${j}, length is ${middle.length}`);
                if (curr[0] == currChara || curr.substring(0,2) == currChara) {
                    console.log(`MULTIPLE SPRITES IN LINE ${lineNum}: found!`);
                    charaIndex = j;
                    break;
                }
            }
        }
        if (branch) {formatted += "        ";}
        if (charaIndex != -1 || suffix == "") {
            formatted += `${prefix} ${middle[charaIndex]} ${suffix}\n`;
        }
        else if (prefix == "hide") {
            formatted += `${prefix} ${currChara} ${suffix}\n`;
        }
        else {
            formatted += `### ERROR IN LINE ${lineNum}: No character associated with transition. Prefix is ${prefix}\n`;
        }
    }
    
    return formatted;
}

function setSprite(spritechar, mvmt, base, emot, pos){
    console.log(`Setting SPRITE: ${spritechar}`)
    const formatted = [];
    const charas = spritechar.trim();
    if (charas.length != 0){
        const splitCharas = charas.split(",");
        console.log(`Split charas: ${splitCharas}`);
        if (splitCharas.length == 1) {
            console.log("IN SETSPRITE: 1 chara");
            const curr = splitCharas[0];
            let positions = chainPluses(pos);
            const movements = chainPluses(mvmt);
            const fbase = base.trim();
            const femote = emot.trim();
            console.log(`Base is [${fbase}] and emote is [${femote}]`);
            let line = `${curr}`
            if (fbase.length != 0 || femote.length != 0) {
                line += ` ${fbase}${femote}`;
            }
            if (positions.length != 0 && movements.length != 0) {
                if (!positions.includes("face")) {
                    if (positions.includes("right")){
                        positions += ", faceleft";
                    }
                    else if (positions.includes("left")) {
                        positions += ", faceright";
                    }
                }
                line += ` at ${positions}, ${movements}`;
            }
            else if (positions.length != 0) {
                if (!positions.includes("face")) {
                    if (positions.includes("right")){
                        positions += ", faceleft";
                    }
                    else if (positions.includes("left")) {
                        positions += ", faceright";
                    }
                }
                line += ` at ${positions}`;
            }
            else if (movements.length != 0) {
                line += ` at ${movements}`;
            }
            formatted.push(line);
        }
        else {
            console.log("IN SETSPRITE: 1+ chara");
            console.log(`Split length: ${splitCharas.length}`);
            for (let i = 0; i < splitCharas.length; i++) {
                const currChar = splitCharas[i];
                const currBase = findCorresponding(currChar, base);
                const emotions = findCorresponding(currChar, emot); 
                console.log(`found base [${currBase}] and emotions [${emotions}]`);
                let line = `${splitCharas[i].trim()}`;
                if (currBase.length != 0 || emotions.length != 0) {
                    line += ` ${currBase}${emotions}`;
                }
                let positions = chainPluses(findCorresponding(currChar, pos));
                const movements = chainPluses(findCorresponding(currChar, mvmt)); 
                console.log(`formatted pos: ${positions}, formatted mvmt: ${movements}`);
                if (positions.length != 0 && positions.length != 0) {
                    if (!positions.includes("face")) {
                        if (positions.includes("right")){
                            positions += ", faceleft";
                        }
                        else if (positions.includes("left")) {
                            positions += ", faceright";
                        }
                    }
                    line += ` at ${positions}, ${movements}`;
                }
                else if (positions.length != 0) {
                    if (!positions.includes("face")) {
                        if (positions.includes("right")){
                            positions += ", faceleft";
                        }
                        else if (positions.includes("left")) {
                            positions += ", faceright";
                        }
                    }
                    line += ` at ${positions}`;
                }
                else if (movements.length != 0) {
                    line += ` at ${movements}`;
                }
                console.log(`pushing ${line}`);
                formatted.push(line);
            }
        }
    }
    return formatted;
}

function findChara(thingy) {
    if (!thingy) {
        return "";
    }
    const startIndex = thingy.indexOf("(");
    const endIndex = thingy.indexOf(")");
    if (startIndex != -1) {
        return thingy.substring(startIndex + 1, endIndex);
    }
    return "";
}

function findCorresponding(spritechar, thingy){
    if (!thingy) {
        console.log("FINDCORRESPONDING: Passed in empty parameters");
        return "";
    }
    const splitThingy = thingy.trim().split(",");
    const lookFor = `(${spritechar.trim()})`;
    console.log(`Finding corresponding for ${lookFor}`);
    for (let i = 0; i < splitThingy.length; i++) {
        if (splitThingy[i].includes(lookFor)){
            const startIndex = splitThingy[i].indexOf("(");
            const corresp = splitThingy[i].substring(0, startIndex - 1);
            console.log(`Corresponding found: ${corresp.trim()}`);
            return corresp.trim();
        }
    }
    return "";
}

function chainPluses(thingy){
    const splitThingy = thingy.trim().split("+");
    let thingies = splitThingy[0];
    for (let i = 1; i < splitThingy.length; i++) {
        thingies += `, ${splitThingy[i]}`;
    }
    return thingies;
}

function formatDialogue(speakerChar, text) {
    console.log(`Formatting DIALOGUE: ${text}`)
    let formatted = "";
    let dialogue = "";
    const speaker = speakerChar.trim();
    if (text.includes(`"`)) {
        dialogue = text;
    }
    else {
        dialogue = `"${text}"`
    }

    if (speaker.length != 0) {
        formatted = `${speaker} ${dialogue}\n`;
    }
    else {
        formatted = `${dialogue}\n`
    }
    return formatted;
}

function formatNotes(notes) {
    console.log(`Formatting NOTES: ${notes}`);
    const formatted = `# NOTES: ${notes.trim()}\n`;
    return formatted;
}

function formatChoice(section, text, isChoice) {
    let formatted = "";
    if (isChoice){
        console.log(`Formatting CHOICE: ${text}`);
        if (section.includes("a")) {
            formatted = `menu:\n    "${text.trim()}":\n`;
        }
        else {
            formatted = `    "${text.trim()}":\n`;
        }
    }
    else {
        console.log(`Formatting BRANCH: ${text}`);
        if (text.trim() !== "") {
            formatted = `if ${text.trim()}:\n`;
        }
        else {
            formatted = "else:\n";
        }
    }
    return formatted;
}

function formatLines(rows) {
    let branch = false;
    const branchTab = "        ";
    let code = "# ====== Formatted renpy lines =====\n\n";
    for (let i = 0; i < rows.length; i++) {
        const cnt = i + 2;
        console.log(`=====Formatting LINE: ${cnt}=====`)
        const currLine = rows[i];
        console.log(`=====${currLine}`)
        if (currLine.section.includes("Convergence")) {
            branch = false;
        }
        if (currLine.section.length != 0){
            if (branch && !currLine.section.includes("Branch")) {code += branchTab;}
            code += formatSection(currLine.section);
        }
        if (currLine.notes.length != 0){
            if (branch) {code += branchTab;}
            code += formatNotes(currLine.notes);
        }
        if (currLine.bgm.length != 0){
            if (branch) {code += branchTab;}
            code += formatBGM(currLine.bgm);
        }
        if (currLine.sfx.length != 0){
            if (branch) {code += branchTab;}
            code += formatSFX(currLine.sfx);
        }
        if (currLine.bg.length != 0){
            if (branch) {code += branchTab;}
            code += formatBCG(currLine.bg);
        }
        if (currLine.cg.length != 0){
            if (branch) {code += branchTab;}
            code += formatBCG(currLine.cg);
        }
        if (currLine.sprite.length != 0 || currLine.transition.length != 0){
            code += formatSprite(currLine.transition, currLine.sprite, currLine.mvmt, currLine.base, currLine.emot, currLine.pos, cnt, branch);
        }
        if (currLine.section.includes("Choice")) {
            code += formatChoice(currLine.section, currLine.text, 1);
            branch = true;
        }
        else if (currLine.section.includes("Branch")) {
            code += formatChoice(currLine.section, currLine.text, 0);
            branch = true;
        }
        else if (currLine.text.length != 0){
            if (branch) {code += branchTab;}
            code += formatDialogue(currLine.speaker, currLine.text);
        }
    }

    return code += "\nreturn\n";
}

function downloadFile(code, fileName) {

    const dlPrompt = confirm(
        `Do you want to download the formatted file: ${fileName}.rpy?`
    );

    if (!dlPrompt) {
        return;
    }

    const blob = new Blob([code], {
        type: "text/x-python"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${fileName}.rpy`;

    a.click();

    URL.revokeObjectURL(url);
}