# Hugo Blog with LoveIt Theme

This is a personal blog built with [Hugo](https://gohugo.io/) static site generator and the [LoveIt theme](https://github.com/dillonzq/LoveIt).

## Features

- Responsive design
- Dark mode support
- Comment system (Giscus)
- Search functionality
- SEO optimization
- Social media integration
- Analytics integration

## Prerequisites

- [Hugo](https://gohugo.io/getting-started/installing/) (extended version)
- Git

## Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme.git
   cd hugo-blog-loveit-theme
   ```

2. Initialize and update the theme submodule:
   ```bash
   git submodule init
   git submodule update
   ```

3. Start the development server:
   ```bash
   hugo server -D
   ```

4. Open your browser and navigate to `http://localhost:1313` to view the site.

## Deployment

This blog is automatically deployed to GitHub Pages using GitHub Actions. The workflow is defined in `.github/workflows/gh-pages.yml`.

To deploy manually, build the site and push the `public` directory to the `gh-pages` branch:
```bash
hugo -D
# Then deploy the public directory to your hosting service
```

## Project Structure

```
hugo-blog-loveit-theme/
├── .github/
│   └── workflows/
│       └── gh-pages.yml      # GitHub Actions workflow
├── content/
│   ├── about/
│   │   └── index.md          # About page
│   ├── posts/
│   │   ├── first-post.md     # Sample posts
│   │   └── ...
│   └── _index.md             # Homepage content
├── static/
│   └── images/
│       └── avatar.png        # Avatar image
├── themes/
│   └── LoveIt/               # LoveIt theme submodule
├── hugo.toml                 # Hugo configuration
├── README.md                 # This file (Chinese version)
├── README.en.md              # This file (English version)
└── docs/                     # Project documentation
    ├── 需求文档.md
    ├── 待办清单.md
    └── 项目状态.md
```

## Configuration

The main configuration file is `hugo.toml`. Key settings include:

- Site metadata (title, description, etc.)
- Theme parameters
- Menu configuration
- Social media links
- Comment system (Giscus) settings

## Customization

You can customize the theme by modifying the following:

- `hugo.toml`: Site configuration
- `content/`: Blog posts and pages
- `static/`: Static assets like images
- `themes/LoveIt/`: Theme files (be careful when updating the theme)

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Hugo](https://gohugo.io/) - The world's fastest framework for building websites
- [LoveIt Theme](https://github.com/dillonzq/LoveIt) - A clean, elegant but advanced blog theme for Hugo
- [Giscus](https://giscus.app/) - A comments system powered by GitHub Discussions