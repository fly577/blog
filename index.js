const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');
const chalk = require('chalk');

// ============================================================
// 自动化博客发布工具 — BlogAutoPublisher
// ============================================================

// ----------------------------------------------------------
// 工具函数：Markdown 内容清洗
// ----------------------------------------------------------

/**
 * 去掉 Markdown 语法标记，提取纯文本用于生成摘要
 * @param {string} md - 原始 Markdown 字符串
 * @returns {string} 清洗后的纯文本
 */
function stripMarkdown(md) {
  return md
    // 去掉代码块（```...```）
    .replace(/```[\s\S]*?```/g, '')
    // 去掉行内代码
    .replace(/`{1,3}[^`]*?`{1,3}/g, '')
    // 去掉图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 去掉链接 [text](url)，保留文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 去掉标题标记 #
    .replace(/^#{1,6}\s+/gm, '')
    // 去掉粗体/斜体/删除线
    .replace(/(\*{1,3}|_{1,3}|~{2})(.*?)\1/g, '$2')
    // 去掉引用标记 >
    .replace(/^>\s?/gm, '')
    // 去掉无序列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // 去掉有序列表标记
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 去掉水平分割线
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 去掉 HTML 标签
    .replace(/<[^>]*>/g, '')
    // 合并连续空白行
    .replace(/\n{3,}/g, '\n\n')
    // 去掉行首行尾空白
    .trim();
}

/**
 * 从 Markdown 正文中提取前 n 个字符作为摘要（中文友好）
 * @param {string} content - Markdown 正文（已去掉 frontmatter）
 * @param {number} maxLen - 最大字数，默认 100
 * @returns {string}
 */
function extractDescription(content, maxLen = 100) {
  // 先去掉首行的标题（如果存在）
  const withoutTitle = content.replace(/^#{1,6}\s+[^\n]*\n?/, '').trim();
  const plain = stripMarkdown(withoutTitle);
  // 去掉换行，合并为连续文本
  const singleLine = plain.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

/**
 * 从 Markdown 内容中提取文章标题
 * 优先级：第一个 # 标题 > 文件名（去扩展名）> "Untitled"
 * @param {string} content - Markdown 原始内容
 * @param {string} fileName - 文件名，作为 fallback
 * @returns {string}
 */
function extractTitle(content, fileName = '') {
  const match = content.match(/^#{1,2}\s+(.+)$/m);
  if (match) return match[1].trim();
  // Fallback：用文件名
  if (fileName) return path.basename(fileName, path.extname(fileName));
  return 'Untitled';
}

// ----------------------------------------------------------
// 核心功能：自动生成并注入 Front Matter
// ----------------------------------------------------------

/**
 * 判断内容是否已经包含 YAML frontmatter
 * @param {string} raw - 文件原始内容
 * @returns {boolean}
 */
function hasFrontmatter(raw) {
  return /^---\s*\n[\s\S]*?\n---/.test(raw);
}

/**
 * 为一篇 Markdown 文章生成 YAML frontmatter 字符串
 * @param {string} content - Markdown 正文（不含已有 frontmatter）
 * @param {object} options
 * @param {string} options.fileName - 文件名
 * @param {string} [options.date] - 日期 YYYY-MM-DD，默认今天
 * @param {string[]} [options.tags] - 标签列表
 * @returns {string}
 */
function buildFrontmatterBlock(content, options = {}) {
  const date = options.date || new Date().toISOString().slice(0, 10);
  const title = extractTitle(content, options.fileName);
  const description = extractDescription(content, 100);
  const tags = options.tags && options.tags.length > 0
    ? '\ntags:\n' + options.tags.map((t) => `  - ${t}`).join('\n')
    : '';

  return [
    '---',
    `title: "${title}"`,
    `date: ${date}`,
    `description: "${description}"`,
    tags,
    '---',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * 为单个 .md 文件注入 frontmatter（写回磁盘）
 * @param {string} filePath - .md 文件的绝对路径
 * @param {object} options - 传递给 buildFrontmatterBlock
 * @returns {{ file: string, injected: boolean, title: string, description: string }}
 */
function injectFrontmatter(filePath, options = {}) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  if (hasFrontmatter(raw)) {
    return {
      file: fileName,
      injected: false,
      reason: '已有 frontmatter，跳过',
      title: null,
      description: null,
    };
  }

  // 把整个 raw 当作正文来提取信息（因为还没有 frontmatter）
  const title = extractTitle(raw, fileName);
  const description = extractDescription(raw, 100);
  const fmBlock = buildFrontmatterBlock(raw, { ...options, fileName });

  // 写入：frontmatter + 原始内容
  const newContent = fmBlock + '\n' + raw.trimStart();
  fs.writeFileSync(filePath, newContent, 'utf-8');

  return {
    file: fileName,
    injected: true,
    title,
    description,
  };
}

/**
 * 批量处理目录下所有 .md 文件
 * @param {string} dirPath - 目录路径
 * @param {object} options - 传递给 injectFrontmatter
 * @returns {object[]}
 */
function batchInjectFrontmatter(dirPath, options = {}) {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) throw new Error(`目录不存在: ${absPath}`);
  if (!fs.statSync(absPath).isDirectory()) throw new Error(`路径不是目录: ${absPath}`);

  const files = fs
    .readdirSync(absPath)
    .filter((f) => path.extname(f).toLowerCase() === '.md')
    .sort();

  if (files.length === 0) {
    console.log(chalk.yellow(`⚠ 在 ${absPath} 中没有找到 .md 文件`));
    return [];
  }

  console.log(chalk.cyan(`\n📂 扫描目录: ${absPath}`));
  console.log(chalk.gray(`   找到 ${files.length} 个 Markdown 文件`));
  console.log(chalk.bold('🔧 开始注入 Front Matter...\n'));

  const results = [];
  for (const file of files) {
    const filePath = path.join(absPath, file);
    const result = injectFrontmatter(filePath, options);
    results.push(result);

    if (result.injected) {
      console.log(`  ${chalk.green('✔')} ${chalk.bold(file)}`);
      console.log(`    ${chalk.yellow('标题:')} ${result.title}`);
      console.log(`    ${chalk.yellow('摘要:')} ${chalk.dim(result.description)}`);
    } else {
      console.log(`  ${chalk.dim('⊘')} ${chalk.dim(file)} — ${result.reason}`);
    }
  }

  const injectedCount = results.filter((r) => r.injected).length;
  const skipCount = results.filter((r) => !r.injected).length;

  console.log('');
  console.log(
    chalk.green(`✅ 注入完成！新增 ${injectedCount} 篇，跳过 ${skipCount} 篇\n`)
  );

  return results;
}

// ----------------------------------------------------------
// 核心功能：发布到 Hexo
// ----------------------------------------------------------

/**
 * 在 blogDir 目录下执行 hexo 命令
 * @param {string} blogDir - Hexo 博客根目录
 * @param {string} cmd - 要执行的 hexo 子命令，如 'generate'、'clean'
 * @returns {{ success: boolean, output: string }}
 */
function runHexoCommand(blogDir, cmd) {
  const blogPath = path.resolve(blogDir);
  if (!fs.existsSync(path.join(blogPath, '_config.yml'))) {
    throw new Error(`目录不是有效的 Hexo 博客: ${blogPath}`);
  }

  const command = process.platform === 'win32'
    ? `cd /d "${blogPath}" && npx hexo ${cmd}`
    : `cd "${blogPath}" && npx hexo ${cmd}`;

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 60000,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stderr || err.stdout || err.message };
  }
}

/**
 * 将源目录的文章发布到 Hexo 博客
 * - 复制 .md 文件到 blog/source/_posts/
 * - 可选：构建静态站点
 *
 * @param {string} sourceDir - 源文章目录
 * @param {object} options
 * @param {string} options.blogDir - Hexo 博客路径，默认 './blog'
 * @param {boolean} options.force - 是否覆盖已存在的文件
 * @param {boolean} options.dryRun - 仅预览，不实际复制
 * @param {boolean} options.build - 是否在复制后执行 hexo generate
 * @param {boolean} options.clean - build 前是否先 hexo clean
 * @returns {{ copied: object[], skipped: object[], build: object|null }}
 */
function publishToHexo(sourceDir, options = {}) {
  const {
    blogDir = './blog',
    force = false,
    dryRun = false,
    build = false,
    clean = false,
    deploy = false,
  } = options;

  const sourcePath = path.resolve(sourceDir);
  const blogPath = path.resolve(blogDir);
  const postsDir = path.join(blogPath, 'source', '_posts');

  // 校验
  if (!fs.existsSync(sourcePath)) throw new Error(`源目录不存在: ${sourcePath}`);
  if (!fs.existsSync(blogPath)) throw new Error(`博客目录不存在: ${blogPath}`);
  if (!fs.existsSync(postsDir)) throw new Error(`Hexo posts 目录不存在: ${postsDir}`);

  // 扫描源文件
  const sourceFiles = fs
    .readdirSync(sourcePath)
    .filter((f) => path.extname(f).toLowerCase() === '.md')
    .sort();

  if (sourceFiles.length === 0) {
    console.log(chalk.yellow(`⚠ 源目录 ${sourcePath} 中没有 .md 文件`));
    return { copied: [], skipped: [], build: null };
  }

  const header = dryRun ? '🔍 试运行（不会实际修改文件）' : '📤 开始发布到 Hexo';
  console.log(chalk.cyan(`\n${header}`));
  console.log(chalk.gray(`   源目录:   ${sourcePath}`));
  console.log(chalk.gray(`   目标目录: ${postsDir}`));
  console.log(chalk.gray(`   找到 ${sourceFiles.length} 篇文章\n`));

  const copied = [];
  const skipped = [];

  for (const file of sourceFiles) {
    const srcFile = path.join(sourcePath, file);
    const destFile = path.join(postsDir, file);
    const raw = fs.readFileSync(srcFile, 'utf-8');
    const parsed = matter(raw);

    // 检查是否有 frontmatter
    if (!hasFrontmatter(raw)) {
      console.log(
        `  ${chalk.yellow('⚠')} ${chalk.bold(file)} — 缺少 frontmatter，建议先运行 inject`
      );
    }

    // 检查目标是否已存在
    if (fs.existsSync(destFile) && !force) {
      skipped.push({ file, reason: '目标已存在（使用 --force 覆盖）' });
      console.log(`  ${chalk.dim('⊘')} ${chalk.dim(file)} — 已存在，跳过`);
      continue;
    }

    if (dryRun) {
      copied.push({ file, title: parsed.data.title || '(无标题)', dryRun: true });
      console.log(`  ${chalk.blue('•')} ${chalk.bold(file)} ${chalk.dim('[试运行]')}`);
      console.log(`    ${chalk.yellow('标题:')} ${parsed.data.title || chalk.dim('(未设置)')}`);
    } else {
      // 实际复制（保留原始文件的完整内容）
      fs.copyFileSync(srcFile, destFile);
      copied.push({ file, title: parsed.data.title || '(无标题)', dryRun: false });
      const tag = fs.existsSync(destFile) ? '已覆盖' : '已复制';
      console.log(`  ${chalk.green('✔')} ${chalk.bold(file)} — ${tag}`);
      console.log(`    ${chalk.yellow('标题:')} ${parsed.data.title || chalk.dim('(未设置)')}`);
    }
  }

  console.log('');
  console.log(
    chalk.green(`✅ 发布完成！复制 ${copied.length} 篇，跳过 ${skipped.length} 篇`)
  );

  // 构建
  let buildResult = null;
  if (build && !dryRun) {
    if (clean) {
      console.log(chalk.cyan('\n🧹 清理旧构建缓存...'));
      const cleanResult = runHexoCommand(blogPath, 'clean');
      if (!cleanResult.success) {
        console.log(chalk.red(`   hexo clean 失败:\n${cleanResult.output}`));
      }
    }

    console.log(chalk.cyan('\n🔨 生成静态站点...'));
    buildResult = runHexoCommand(blogPath, 'generate');
    if (buildResult.success) {
      console.log(chalk.green('✅ hexo generate 成功！'));
      console.log(chalk.gray(`   静态文件已生成到 ${path.join(blogPath, 'public')}`));
    } else {
      console.log(chalk.red(`❌ hexo generate 失败:\n${buildResult.output}`));
    }
  } else if (build && dryRun) {
    console.log(chalk.dim('\n[试运行] 跳过构建步骤'));
  }

  // 部署（仅在 build 成功或 deploy 单独指定时触发）
  let deployResult = null;
  if (options.deploy && !dryRun) {
    const canDeploy = build ? (buildResult && buildResult.success) : true;
    if (canDeploy) {
      deployResult = deployToGHPages(blogPath);
    } else {
      console.log(chalk.yellow('⚠ 构建未成功，跳过部署'));
    }
  } else if (options.deploy && dryRun) {
    console.log(chalk.dim('[试运行] 跳过部署步骤'));
  }

  console.log('');
  return { copied, skipped, build: buildResult, deploy: deployResult };
}

/**
 * 部署 Hexo 博客到 GitHub Pages（hexo deploy --generate）
 * @param {string} blogDir - Hexo 博客根目录
 * @returns {{ success: boolean, output: string }}
 */
function deployToGHPages(blogDir) {
  const blogPath = path.resolve(blogDir);
  console.log(chalk.cyan('\n🚀 部署到 GitHub Pages...'));
  console.log(chalk.gray(`   博客目录: ${blogPath}`));

  // 读取仓库地址用于展示
  let repoUrl = '';
  try {
    const configPath = path.join(blogPath, '_config.yml');
    const config = fs.readFileSync(configPath, 'utf-8');
    const repoMatch = config.match(/repo:\s*(.+)/);
    if (repoMatch) repoUrl = repoMatch[1].trim();
  } catch (_) { /* ignore */ }

  console.log(chalk.gray(`   目标仓库: ${repoUrl || '(未配置)'}`));

  // hexo deploy --generate（自动构建 + 部署）
  const result = runHexoCommand(blogPath, 'deploy --generate');

  if (result.success) {
    console.log(chalk.green('✅ 部署成功！'));
    if (repoUrl) {
      const urlMatch = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
      if (urlMatch) {
        const user = urlMatch[1];
        const repo = urlMatch[2];
        if (repo.endsWith('.github.io')) {
          console.log(chalk.cyan(`   🌐 访问: https://${repo}/`));
        } else {
          console.log(chalk.cyan(`   🌐 访问: https://${user}.github.io/${repo}/`));
        }
      }
    }
  } else {
    console.log(chalk.red(`❌ 部署失败:\n${result.output}`));
  }

  return result;
}

// ----------------------------------------------------------
// 现有功能：读取并展示 Markdown 文件
// ----------------------------------------------------------

/**
 * 读取指定目录下所有 .md 文件，并解析其 YAML frontmatter
 * @param {string} dirPath - 要扫描的文件夹路径（绝对或相对）
 * @returns {{ fileName: string, filePath: string, frontmatter: object, content: string, excerpt: string }[]}
 */
function loadMarkdownFiles(dirPath) {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`目录不存在: ${absPath}`);
  }
  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${absPath}`);
  }

  const files = fs
    .readdirSync(absPath)
    .filter((f) => path.extname(f).toLowerCase() === '.md')
    .sort();

  if (files.length === 0) {
    console.log(chalk.yellow(`⚠ 在 ${absPath} 中没有找到 .md 文件`));
    return [];
  }

  console.log(chalk.cyan(`📂 扫描目录: ${absPath}`));
  console.log(chalk.gray(`   找到 ${files.length} 个 Markdown 文件\n`));

  const posts = [];
  for (const file of files) {
    const filePath = path.join(absPath, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);

    posts.push({
      fileName: file,
      filePath,
      frontmatter: parsed.data,
      content: parsed.content,
      excerpt: parsed.content.trim().slice(0, 120) + '...',
    });
  }

  return posts;
}

/**
 * 打印文章摘要信息（表格形式）
 */
function printSummary(posts) {
  console.log(chalk.bold('📋 文章列表:\n'));
  console.log(chalk.gray('─'.repeat(60)));

  for (const post of posts) {
    const fm = post.frontmatter;
    console.log(`  ${chalk.green('◆')} ${chalk.bold(post.fileName)}`);
    console.log(`    ${chalk.yellow('标题:')} ${fm.title || chalk.dim('(未设置)')}`);
    console.log(`    ${chalk.yellow('日期:')} ${fm.date || chalk.dim('(未设置)')}`);
    console.log(`    ${chalk.yellow('标签:')} ${fm.tags ? fm.tags.join(', ') : chalk.dim('(未设置)')}`);
    console.log(`    ${chalk.yellow('摘要:')} ${chalk.dim(fm.description || post.excerpt)}`);
    console.log(chalk.gray('─'.repeat(60)));
  }
}

// ============================================================
// 主入口
// ============================================================
function main() {
  const args = process.argv.slice(2);

  // 解析命令
  const command = args[0] || 'scan';

  console.log(chalk.magenta.bold('\n🚀 博客自动化发布工具\n'));

  try {
    switch (command) {
      // --------------------------------------------------
      // node index.js inject [dir]    → 自动注入 frontmatter
      // --------------------------------------------------
      case 'inject':
      case '--inject':
      case '-i': {
        const dirPath = args[1] || './posts';
        batchInjectFrontmatter(dirPath);
        break;
      }

      // --------------------------------------------------
      // node index.js publish [sourceDir] [options]
      //   --blog <dir>    Hexo 博客路径（默认 ./blog）
      //   --force, -f     覆盖已存在的文章
      //   --build, -b     复制后自动 hexo generate
      //   --clean, -c     构建前先 hexo clean
      //   --deploy, -d    生成后自动部署到 GitHub Pages
      //   --dry-run       仅预览，不实际复制
      // --------------------------------------------------
      case 'publish':
      case '--publish':
      case '-p': {
        const sourceDir = args[1] || './posts';
        const flags = new Set(args.slice(2));

        publishToHexo(sourceDir, {
          blogDir: parseFlag(flags, '--blog') || './blog',
          force: flags.has('--force') || flags.has('-f'),
          build: flags.has('--build') || flags.has('-b'),
          clean: flags.has('--clean') || flags.has('-c'),
          deploy: flags.has('--deploy') || flags.has('-d'),
          dryRun: flags.has('--dry-run'),
        });
        break;
      }

      // --------------------------------------------------
      // node index.js deploy [--blog <dir>]
      //   --blog <dir>    Hexo 博客路径（默认 ./blog）
      // --------------------------------------------------
      case 'deploy':
      case '--deploy':
      case '-d': {
        const flags = new Set(args.slice(1));
        const blogDir = parseFlag(flags, '--blog') || './blog';
        deployToGHPages(blogDir);
        break;
      }

      // --------------------------------------------------
      // node index.js scan [dir]      → 扫描并展示文章
      // --------------------------------------------------
      case 'scan':
      case '--scan':
      case '-s':
      default: {
        const dirPath = args[1] || './posts';
        const posts = loadMarkdownFiles(dirPath);
        if (posts.length > 0) {
          printSummary(posts);
          console.log(chalk.green(`\n✅ 成功解析 ${posts.length} 篇文章！\n`));
        }
        break;
      }
    }
  } catch (err) {
    console.error(chalk.red(`\n❌ 错误: ${err.message}\n`));
    process.exit(1);
  }
}

/**
 * 从命令行参数集合中提取带值选项
 * 例如 --blog ./my-blog → './my-blog'
 * @param {Set<string>} flags
 * @param {string} flagName
 * @returns {string|null}
 */
function parseFlag(flags, flagName) {
  // flags 是 Set，但我们需要从原始 args 中找到值
  // 所以改从 process.argv 中解析
  const rawArgs = process.argv.slice(2);
  const idx = rawArgs.indexOf(flagName);
  if (idx !== -1 && idx + 1 < rawArgs.length) {
    const val = rawArgs[idx + 1];
    if (!val.startsWith('-')) return val;
  }
  return null;
}

// ============================================================
// 导出
// ============================================================
module.exports = {
  // 读取
  loadMarkdownFiles,
  printSummary,
  // 注入
  injectFrontmatter,
  batchInjectFrontmatter,
  buildFrontmatterBlock,
  // 发布
  publishToHexo,
  deployToGHPages,
  runHexoCommand,
  // 工具
  extractTitle,
  extractDescription,
  stripMarkdown,
  hasFrontmatter,
};

// 直接运行（非 require 时）
if (require.main === module) {
  main();
}
