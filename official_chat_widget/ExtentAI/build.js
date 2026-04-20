// build.js
const esbuild = require("esbuild");
const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");

(async () => {
    const ENTRY = "panel.js";
    const TMP = "__bundle.tmp.js";
    const OUT = "panel.obf.js";

    // 1️⃣ Bundle + minify
    await esbuild.build({
        entryPoints: [ENTRY],
        bundle: true,
        minify: true,
        sourcemap: false,
        target: ["chrome90"],
        outfile: TMP
    });

    // 2️⃣ Obfuscate
    const sourceCode = fs.readFileSync(TMP, "utf8");

    const obfuscated = JavaScriptObfuscator.obfuscate(sourceCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,

        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,

        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,

        renameGlobals: true,
        selfDefending: true,
        simplify: true,

        numbersToExpressions: true,
        splitStrings: true,
        splitStringsChunkLength: 6
    });

    fs.writeFileSync(OUT, obfuscated.getObfuscatedCode());

    // 3️⃣ Cleanup
    fs.unlinkSync(TMP);

    console.log("✅ Build xong → panel.obf.js");
})();
