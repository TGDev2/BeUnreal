import fs from 'fs';
import path from 'path';
import process from 'process';
import child_process from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

/*─────────────────────────────*
 * Versions minimales requises
 *─────────────────────────────*/
const MIN_JAVA_MAJOR = 21;

/*------------------------------------------------
 |  Utilitaires : détection de version du JDK
 *-----------------------------------------------*/
/** 
 * Retourne la *major* du JDK depuis `java -version`. 
 * La bannière est envoyée sur **stderr**, pas stdout. 
 */ 
const getJavaVersion = (javaBin) => { 
  try { 
    const { stderr } = child_process.spawnSync(javaBin, ['-version'], { 
      encoding: 'utf8', 
    }); 
    const match = stderr.match(/version "(?<ver>\d+)(\.\d+)?/); 
    return match ? Number(match.groups.ver) : undefined; 
  } catch { 
    return undefined; 
  } 
};

const abort = (msg) => {
    console.error(`\n❌  ${msg}\n`);
    process.exit(1);
};

/*─────────────────────────────*
 * 1.  SDK Android
 *─────────────────────────────*/
const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    '';

if (!sdk || !fs.existsSync(sdk)) {
    abort('ANDROID_HOME / ANDROID_SDK_ROOT non défini ou invalide.');
}

const localProps = path.resolve('android', 'local.properties');
fs.writeFileSync(
    localProps,
    '# Auto-generated – DO NOT COMMIT\n' +
    `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`,
);
console.log(`✅  ${localProps} → sdk.dir=${sdk}`);

/*─────────────────────────────*
 * 2.  JDK ≥ 21 obligatoire
 *─────────────────────────────*/
if (!process.env.JAVA_HOME) {
    abort('JAVA_HOME non défini (JDK 21 requis).');
}

const javaHome = process.env.JAVA_HOME;
const javaBin = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const major = getJavaVersion(javaBin);
if (!major || major < MIN_JAVA_MAJOR) {
    abort(
        `JDK ${MIN_JAVA_MAJOR}+ requis pour Android (AGP 8.4). ` +
        `Version détectée : ${major ?? 'inconnue'}.`
    );
}

const gradleProps = path.resolve('android', 'gradle.properties');
let content = fs.existsSync(gradleProps)
    ? fs.readFileSync(gradleProps, 'utf8')
        .split('\n')
        .filter((l) => !l.startsWith('org.gradle.java.home='))
        .join('\n')
        .trimEnd() + '\n'
    : '# Gradle properties – auto-maintained\n';

content += `org.gradle.java.home=${javaHome.replace(/\\/g, '\\\\')}\n`;
fs.writeFileSync(gradleProps, content);

console.log(`✅  ${gradleProps} → org.gradle.java.home=${javaHome}`);

/*─────────────────────────────*
 * 3.  adb dans le PATH courant
 *─────────────────────────────*/
const adbDir = path.join(sdk, 'platform-tools');
const hasAdb   = fs.existsSync(path.join(adbDir, process.platform === 'win32' ? 'adb.exe' : 'adb'));
if (!hasAdb) {
    abort(
        'adb (Android Platform-Tools) manquant dans votre SDK. ' +
        'Ouvrez Android Studio > SDK Manager et installez « Android SDK Platform-Tools »'
    );
}

// Injecte platform-tools en tête du PATH *pour ce process* et tous ses enfants
if (!process.env.PATH.split(path.delimiter).includes(adbDir)) {
    process.env.PATH = `${adbDir}${path.delimiter}${process.env.PATH}`;
    console.log(`✅  PATH ← +${adbDir}`);
}

/*─────────────────────────────*
 * Tout est OK
 *─────────────────────────────*/
console.log('🎉  Environnement Android prêt – JDK 21 détecté.');
