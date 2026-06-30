/**
 * Script de versionamento automático
 * 
 * Uso:
 *   node scripts/version.js patch   → 1.0.0 → 1.0.1
 *   node scripts/version.js minor   → 1.0.0 → 1.1.0
 *   node scripts/version.js major   → 1.0.0 → 2.0.0
 *   node scripts/version.js 1.2.3   → Define versão específica
 * 
 * O script:
 * 1. Atualiza a versão no package.json
 * 2. Gera tag Git com a nova versão
 * 3. Cria commit automático
 * 4. Faz push para o repositório
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

const type = process.argv[2];

if (!type) {
  console.log('Uso: node scripts/version.js <patch|minor|major|x.y.z>');
  console.log('Exemplos:');
  console.log('  node scripts/version.js patch    → 1.0.0 → 1.0.1');
  console.log('  node scripts/version.js minor    → 1.0.0 → 1.1.0');
  console.log('  node scripts/version.js major    → 1.0.0 → 2.0.0');
  console.log('  node scripts/version.js 1.2.3    → Define 1.2.3');
  process.exit(1);
}

function bumpVersion(version, bumpType) {
  const parts = version.split('.').map(Number);
  switch (bumpType) {
    case 'patch':
      parts[2]++;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    default:
      return bumpType; // Versão específica
  }
  return parts.join('.');
}

const newVersion = bumpVersion(currentVersion, type);

console.log(`\n📦 Versionamento: ${currentVersion} → ${newVersion}\n`);

// 1. Atualizar package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ package.json atualizado');

// 2. Atualizar CHANGELOG.md com a nova versão
const today = new Date();
const dateStr = today.toISOString().split('T')[0].split('-').reverse().join('-');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
let changelog = fs.readFileSync(changelogPath, 'utf-8');

// Adicionar nova seção no topo (após o cabeçalho)
const headerEnd = changelog.indexOf('\n## ');
const newEntry = `## [${newVersion}] - ${dateStr}\n\n### Adicionado\n- (descreva as mudanças)\n\n`;

if (headerEnd > 0) {
  changelog = changelog.slice(0, headerEnd) + '\n' + newEntry + changelog.slice(headerEnd);
} else {
  changelog += '\n' + newEntry;
}

fs.writeFileSync(changelogPath, changelog);
console.log('✅ CHANGELOG.md atualizado');

// 3. Git add, commit e tag
try {
  execSync('git add package.json CHANGELOG.md', { cwd: path.join(__dirname, '..') });
  execSync(`git commit -m "chore: v${newVersion}"`, { cwd: path.join(__dirname, '..') });
  execSync(`git tag v${newVersion}`, { cwd: path.join(__dirname, '..') });
  console.log(`✅ Commit e tag v${newVersion} criados`);
} catch (e) {
  console.error('❌ Erro ao criar commit/tag:', e.message);
  process.exit(1);
}

// 4. Push
try {
  execSync('git push && git push --tags', { cwd: path.join(__dirname, '..') });
  console.log('✅ Push realizado com sucesso!');
} catch (e) {
  console.error('❌ Erro ao fazer push:', e.message);
  console.log('Execute manualmente: git push && git push --tags');
}

console.log(`\n🎉 Versão ${newVersion} publicada!\n`);
