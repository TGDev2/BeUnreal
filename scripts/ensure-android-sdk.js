import fs from 'fs';
import path from 'path';
import process from 'process';
import dotenv from 'dotenv';

dotenv.config();

const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    '';

if (!sdk) {
    console.error(
        '\n❌  ANDROID_HOME (ou ANDROID_SDK_ROOT) n’est pas défini.\n' +
        '   → Installez le SDK Android et exportez la variable d’environnement.\n',
    );
    process.exit(1);
}

if (!fs.existsSync(sdk)) {
    console.error(`\n❌  Le dossier SDK "${sdk}" est introuvable.\n`);
    process.exit(1);
}

const localPropsPath = path.resolve('android', 'local.properties');
const escapedSdkPath = sdk.replace(/\\/g, '\\\\');
const content =
    '# Auto-generated – DO NOT COMMIT\n' +
    `sdk.dir=${escapedSdkPath}\n`;

fs.writeFileSync(localPropsPath, content);
console.log(`✅  ${localPropsPath} généré avec sdk.dir=${sdk}`);
