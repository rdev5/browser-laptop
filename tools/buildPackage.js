/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var VersionInfo = require('./lib/versionInfo')
var execute = require('./lib/execute')
const ignoredPaths = require('./lib/ignoredPaths')
const config = require('./lib/config')
const path = require('path')
const fs = require('fs')

const isWindows = process.platform === 'win32'
const isDarwin = process.platform === 'darwin'
var arch = 'x64'
const isLinux = process.platform === 'linux'

var env = {
  NODE_ENV: 'production',
  CHANNEL: process.env.CHANNEL,
  REF: process.env.REF || null,
  REFERRAL_API_KEY: process.env.REFERRAL_API_KEY
}

const channel = env.CHANNEL
const ref = env.REF

const torVerificationPublicKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBFqrIn4BEADgqJTNhqw8B/T7huOm31dDzkqJEB8pIpcML35POcYs5CwOvGO2
s2rzCh6Atys212CCZEMs4spWAReXux0KirKq0ON9N8modct2AcNS5bSdmyMhQehP
wb1jt3bVX6nufJqrlYIf34LdHx3DAUhLr8bFSK9Hskt15Q5UyT0UKUfSl5t69zLf
DFZObR0aHqltfuenFfquO6aUpXopyhd6L89Jsm/o7vME6vdG/TJ3U97AV5wwDlrH
mRUWrXxgqcPrrKPJ0SdQ3cf36iPdvglsVC0m9LU6XzTph61gD1JnXmYmxmRtubYu
wr9N2JB+aTxR3TsOn3hfpWVrLGME6wpFMkvRzVaHQc8PUJhVMmeZHXECr264/R9d
PDCAFoqaAiXjhvDbtYK2iWTdos2WWFZ+SdfSQaNBv37nQ5UO2sZfa/iKwVzu7Xka
VHCKckm37PBNQwVmwUjunTa3TpKE7Mxygm1v3dCofxCm+Eq9/4uyL6sVMMbtBiUI
1rY9G8zyF8Z+n+jQmiMHtwk2pBp7lQf4bnSUrc401MQ2WOX67COU2DY4j4cUaGzi
6/StRDUKX+3InXEaNymPYuelAK6iafh+TvOeH4nRfz/mmlL4deWZKeyuEgqZK6E3
uCxyUbwXwfqbs0REma58gl7qCOOmBRDUxGlOryxdHGph4Hj4MK9GcDazEwARAQAB
tC5QcmFuamFsIEp1bWRlIChEZW1vKSA8cHJhbmphbC5qdW1kZUBnbWFpbC5jb20+
iQJOBBMBCAA4FiEE07dgRmQdLCde+McomT2q8CmO1P4FAlqrIn4CGwMFCwkIBwIG
FQoJCAsCBBYCAwECHgECF4AACgkQmT2q8CmO1P7PkQ/+KLBGeErNQTV0I6dvSTdd
KfQTcLmc1xnGIqcCYP1evu54XmZmHJwr6O7TdRovo/ycotKeKbZLug6QTr9Az+uv
Gd1hL3WC4D+67KDbJHupCowW3RPKYmhHTgvKC74czN5IzAX8CsjtXMSWbCS9iqgG
QewQJsfHvvFG+r1HwUs37N7L0Oev1g2qzdP+pLOKwAgA62o7xUtUIQETUPjO1D9P
G09G2QPLGwEQwPOaSk2dom5bmHBBVkAXXrWmgZ8cDdIJJxGcFneRcIYBhA6wxAGz
vOKnTWYN6W4OC4X4TDUhrUTdwCjoScBdrX4GAbolWeI++d23b/6PL47HtnGiTl64
KtvmKKSqSvImOHBT78GmI0mdZ9VBfbyr5blC/wuww/Du3ahVvdsFv+30HEpsOaUd
CyK7A3wiT0O+69M7SpTMhA2/QU3AHZfPDo9EGCAgh9xeljN2Thcqxl+vyAWBteVv
5PUXs46rHU3F1dqHLlGlHTZwY6MOcTSPegHIGV+vZoJwfuj8IQbw/x0712SUJzvX
c4HsBsePkJe3TaRVqVdAysCRK3a/pVDp9Rcf2FCRTXdDKBZeli28/0md81CiGFHf
EaoW/JFFy6d91iW+RB2E8GefYDpa9+JrheUSDV3aPoWprX3yQiIeWz5jpINsQStm
akWrUSRBaq7kcZeMJnJRysA=
=GCo9
-----END PGP PUBLIC KEY BLOCK-----`

var channels = { nightly: true, developer: true, beta: true, dev: true }
if (!channels[channel]) {
  throw new Error('CHANNEL environment variable must be set to nightly, developer, beta or dev')
}

var appIcon
if (isWindows) {
  appIcon = `res/${channel}/app.ico`
  if (process.env.TARGET_ARCH === 'ia32') {
    arch = 'ia32'
  }
} else if (isDarwin) {
  appIcon = `res/${channel}/app.icns`
} else {
  appIcon = `res/${channel}/app.png`
}

var appName
switch (channel) {
  case 'nightly':
    appName = 'Brave-Nightly'
    break
  case 'developer':
    appName = 'Brave-Developer'
    break
  case 'beta':
    appName = 'Brave-Beta'
    break
  case 'dev':
    appName = 'Brave'
    break
  default:
    throw new Error('CHANNEL environment variable must be set to nightly, developer, beta or dev')
}

if (isLinux) {
  appName = appName.toLowerCase()
}

if (isWindows) {
  appName = appName.replace(/-/, '')
}

var productDirName = 'brave'
if (channel !== 'dev') {
  productDirName += `-${channel}`
}

const buildDir = appName + '-' + process.platform + '-' + arch
const torS3Prefix = 'https://s3.us-east-2.amazonaws.com/demo-tor-binaries/'

var torURL = torS3Prefix + 'tor-' + process.platform
if (isWindows) {
  torURL += '.zip'
}

var torSigURL = torS3Prefix + 'tor-' + process.platform + '.sig'

console.log('Writing buildConfig.js...')
config.writeBuildConfig(
  {
    channel: channel,
    BROWSER_LAPTOP_REV: require('git-rev-sync').long(),
    nodeEnv: env.NODE_ENV,
    ref: ref || null,
    referralAPI: env.REFERRAL_API_KEY
  },
  'buildConfig.js'
)

var cmds = ['echo cleaning up target...']

if (isWindows) {
  cmds = cmds.concat([
    'cmd.exe /c for /d %x in (*-win32-x64) do rmdir /s /q "%x"',
    'cmd.exe /c for /d %x in (*-win32-ia32) do rmdir /s /q "%x"'
  ])

  // Remove the destination folder
  cmds = cmds.concat([
    '(if exist dist rmdir /s /q dist)'
  ])
} else {
  cmds = cmds.concat([
    'rm -Rf ' + '*-' + process.platform + '-' + arch,
    'rm -Rf dist',
    `rm -f *.tar.bz2`
  ])
}

cmds = cmds.concat([
  'echo done',
  'echo starting build...'
])

console.log('Building version ' + VersionInfo.braveVersion + ' in ' + buildDir + ' with Electron ' + VersionInfo.electronVersion)

cmds = cmds.concat([
  '"./node_modules/.bin/webpack"',
  'npm run checks',
  `node ./node_modules/electron-packager/cli.js . ${appName}` +
    ' --overwrite=true' +
    ' --ignore="' + ignoredPaths.join('|') + '"' +
    ' --platform=' + process.platform +
    ' --arch=' + arch +
    ` --name="${appName}"` +
    ' --version=' + VersionInfo.electronVersion +
    ' --icon=' + appIcon +
    ' --asar=true' +
    ' --app-version=' + VersionInfo.braveVersion +
    ' --build-version=' + VersionInfo.electronVersion +
    ' --protocol="http" --protocol-name="HTTP Handler"' +
    ' --protocol="https" --protocol-name="HTTPS Handler"' +
    ` --product-dir-name="${productDirName}"` +
    ' --version-string.CompanyName="Brave Software"' +
    ` --version-string.ProductName="${appName}"` +
    ' --version-string.Copyright="Copyright 2017, Brave Software"' +
    ` --version-string.FileDescription="${appName}"`
])

function BuildManifestFile () {
  const fileContents = fs.readFileSync('./res/Update.VisualElementsManifest.xml', 'utf8')
  const versionedFileContents = fileContents.replace(/{{braveVersion}}/g, 'app-' + VersionInfo.braveVersion)
  fs.writeFileSync('temp.VisualElementsManifest.xml', versionedFileContents, 'utf8')
}

if (isLinux) {
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, 'resources', 'extensions'))
} else if (isDarwin) {
  const macAppName = `${appName}.app`
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'extensions'))
} else if (isWindows) {
  BuildManifestFile()
  cmds.push('move .\\temp.VisualElementsManifest.xml "' + path.join(buildDir, 'resources', 'Update.VisualElementsManifest.xml') + '"')
  cmds.push('copy .\\res\\start-tile-70.png "' + path.join(buildDir, 'resources', 'start-tile-70.png') + '"')
  cmds.push('copy .\\res\\start-tile-150.png "' + path.join(buildDir, 'resources', 'start-tile-150.png') + '"')
  cmds.push('makensis.exe -DARCH=' + arch + ` res/${channel}/braveDefaults.nsi`)
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, 'resources', 'extensions'))

  // Make sure the Brave.exe binary is squirrel aware so we get squirrel events and so that Squirrel doesn't auto create shortcuts.
  cmds.push(`"node_modules/rcedit/bin/rcedit.exe" ./${appName}-win32-` + arch + `/${appName}.exe --set-version-string "SquirrelAwareVersion" "1"`)
}

// Verify tor binaries and bundle with Brave
var torPath
if (isDarwin) {
  torPath = path.join(buildDir, `${appName}.app`, 'Contents', 'Resources', 'extensions', 'bin')
} else {
  torPath = path.join(buildDir, 'resources', 'extensions', 'bin')
}

cmds.push('mkdirp ' + torPath)
cmds.push('curl -o ' + path.join(torPath, 'tor') + ' ' + torURL)
cmds.push('curl -o ' + path.join(torPath, 'tor-sig') + ' ' + torSigURL)
fs.writeFileSync('temp.asc', torVerificationPublicKey, 'utf8')
cmds.push('gpg --import temp.asc')
cmds.push('gpg --verify ' + path.join(torPath, 'tor-sig') + ' ' + path.join(torPath, 'tor'))
cmds.push('rm -rf temp.asc')

if (isWindows) {
  cmds.push('unzip ' + path.join(torPath, 'tor') + ' -d ' + path.join(buildDir, 'resources', 'extensions', 'bin'))
}

if (isDarwin) {
  const macAppName = `${appName}.app`
  cmds.push('mkdirp ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten'))
  cmds.push('ncp ' + path.join('node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem') + ' ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem'))
} else {
  cmds.push('mkdirp ' + path.join(buildDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten'))
  cmds.push('ncp ' + path.join('node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem') + ' ' + path.join(buildDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem'))
}

execute(cmds, env, (err) => {
  if (err) {
    console.error('buildPackage failed', err)
    process.exit(1)
  }
  config.clearBuildConfig()
  console.log('done')
})
