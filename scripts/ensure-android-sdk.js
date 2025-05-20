import fs from 'fs';
import path from 'path';
import process from 'process';
import dotenv from 'dotenv';

dotenv.config();

/*─────────────────────────────*
 * 1. Chemin SDK Android
 *─────────────────────────────*/
const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    '';

if (!sdk || !fs.existsSync(sdk)) {
    console.error('\n❌  ANDROID_HOME/ANDROID_SDK_ROOT non défini ou invalide.\n');
    process.exit(1);
}

const localProps = path.resolve('android', 'local.properties');
fs.writeFileSync(
    localProps,
    '# Auto-generated – DO NOT COMMIT\n' +
    `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`,
);
console.log(`✅  ${localProps} → sdk.dir=${sdk}`);

/*─────────────────────────────*
 * 2. Chemin JDK (optionnel)
 *─────────────────────────────*/
if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    const gradleProps = path.resolve('android', 'gradle.properties');

    let content = fs.existsSync(gradleProps)
        ? fs
            .readFileSync(gradleProps, 'utf8')
            .split('\n')
            .filter((l) => !l.startsWith('org.gradle.java.home='))
            .join('\n')
            .trimEnd() + '\n'
        : '# Gradle properties – auto-maintained\n';

    content += `org.gradle.java.home=${process.env.JAVA_HOME.replace(/\\/g, '\\\\')}\n`;
    fs.writeFileSync(gradleProps, content);

    console.log(`✅  ${gradleProps} → org.gradle.java.home=${process.env.JAVA_HOME}`);
} else {
    console.warn('\nℹ️  JAVA_HOME non défini – Gradle utilisera son JDK embarqué.\n');
}
