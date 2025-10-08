# AppMod Catalog Blueprints Documentation Site

This directory contains the Docusaurus documentation website that automatically syncs content from the repository's README files.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start          # Opens http://localhost:3000

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Auto-Sync Architecture

### How It Works
The documentation site automatically pulls content from README files throughout the repository:

- **Main README.md** → Homepage content
- **use-cases/**/README.md** → Use case building blocks documentation  
- **examples/**/README.md** → Ready-to-deploy examples documentation

### No Manual Docs Folder
- **Content lives in the repository** alongside the code
- **Documentation stays in sync** with code changes
- **Single source of truth** for all documentation
- No separate docs/ folder to maintain

## Development Workflow

### Content Updates
1. **Edit README files** in the main repository (use-cases, examples, etc.)
2. **Test locally**: `npm start` to preview changes
3. **Push changes**: Auto-deployment triggers on README modifications

### Site Configuration
- **Homepage**: `src/pages/index.js` - Custom feature cards and layout
- **Navigation**: `sidebars.js` - Controls sidebar structure and categories
- **Styling**: `src/css/` - Custom CSS for enhanced UX
- **Config**: `docusaurus.config.js` - Site settings and metadata

## Auto-Deployment

### GitHub Actions Workflow
```
# Triggers on:
- README.md file changes anywhere in repo
- website/ directory changes  
- Manual workflow dispatch
```

### Process
1. **README changes detected** → GitHub Actions triggered
2. **Docusaurus build** → Syncs all repository READMEs
3. **Deploy to GitHub Pages** → Live site updated automatically

### Site URL
https://cdklabs.github.io/cdk-appmod-catalog-blueprints/

## File Structure

```
website/
├── src/
│   ├── pages/index.js         # Custom homepage with feature cards
│   └── css/                   # Custom styling and UX enhancements
├── sidebars.js                # Navigation structure
├── docusaurus.config.js       # Site configuration
└── package.json               # Dependencies and scripts
```

## Key Features

- **Real-time sync**: README changes automatically update the site
- **Enhanced UX**: Custom homepage with improved spacing and navigation
- **Responsive design**: Optimized for desktop and mobile
- **GitHub integration**: Direct links to source code and examples

## Contributing to Documentation

### Content Changes
- **Edit README files** in their respective directories (use-cases/, examples/, etc.)
- **Content automatically syncs** to the documentation site
- **No manual documentation maintenance** required

### Site Improvements  
- **Homepage enhancements**: Modify `src/pages/index.js`
- **Styling updates**: Edit CSS files in `src/css/`
- **Navigation changes**: Update `sidebars.js`

## Troubleshooting

### Common Issues
- **Content not updating**: Check if README files are properly formatted markdown
- **Build failures**: Verify markdown syntax and file paths
- **Styling issues**: Clear cache with `npm run clear`

### Development Tips
- Use `npm start` for hot reloading during development
- All content comes from repository READMEs - edit those, not local files
- Test locally before pushing to ensure proper rendering
