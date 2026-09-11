const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');

marked.use({
  renderer: {
    heading({ text, depth }) {
      const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');
      return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
    },
    image(token) {
      const href = token.href || '';
      const text = token.text || '';
      const title = token.title ? ` title="${token.title}"` : '';
      return `<img src="${href}" alt="${text}"${title} loading="lazy" decoding="async" />`;
    }
  }
});

function calculateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function generateStaticContent() {
  const postsDir = path.join(__dirname, '../backend/content-service/markdown_content/posts');
  const aboutPath = path.join(__dirname, '../backend/content-service/markdown_content/about.md');
  const projectsPath = path.join(__dirname, '../backend/content-service/projects.json');
  const outputDir = path.join(__dirname, '../frontend/public/data');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Process Posts
  const posts = [];
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const rawContent = fs.readFileSync(path.join(postsDir, file), 'utf-8');
        const parsed = matter(rawContent);
        posts.push({
          title: parsed.data.title || file.replace('.md', ''),
          category: parsed.data.category || parsed.data.type || 'technical',
          slug: parsed.data.slug || file.replace('.md', ''),
          createdAt: parsed.data.lastUpdated || parsed.data.date || new Date().toISOString(),
          readingTime: calculateReadingTime(parsed.content),
          content: marked.parse(parsed.content),
        });
      }
    }
  }

  // Sort newest first
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  fs.writeFileSync(path.join(outputDir, 'posts.json'), JSON.stringify(posts, null, 2), 'utf-8');
  console.log(`✅ Generated ${posts.length} static posts in frontend/public/data/posts.json`);

  // 2. Process About
  if (fs.existsSync(aboutPath)) {
    const rawAbout = fs.readFileSync(aboutPath, 'utf-8');
    const parsedAbout = matter(rawAbout);
    const aboutData = {
      title: parsedAbout.data.title || 'About Me',
      lastUpdated: parsedAbout.data.lastUpdated || new Date().toISOString(),
      content: marked.parse(parsedAbout.content),
    };
    fs.writeFileSync(path.join(outputDir, 'about.json'), JSON.stringify(aboutData, null, 2), 'utf-8');
    console.log(`✅ Generated static about content in frontend/public/data/about.json`);
  }

  // 3. Process Projects
  if (fs.existsSync(projectsPath)) {
    const projectsRaw = fs.readFileSync(projectsPath, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'projects.json'), projectsRaw, 'utf-8');
    console.log(`✅ Copied static projects to frontend/public/data/projects.json`);
  }
}

generateStaticContent();
