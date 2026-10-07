# Contributing to Noor Connect

Thank you for your interest in contributing to Noor Connect! This document provides guidelines and instructions for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the issue
- Provide screenshots if applicable
- Mention your device model and OS version
- Include the app version

### Suggesting Features

We welcome feature suggestions! When suggesting a new feature:

- Provide a clear description of the feature
- Explain why this feature would be useful
- Consider if it aligns with the app's privacy-first philosophy
- Provide examples or mockups if possible

### Translating

Noor Connect supports multiple languages. To contribute a translation:

1. Check the `src/locales/` directory for existing language files
2. Create a new language file following the existing structure
3. Translate all keys while maintaining context
4. Submit a pull request with your translation

### Code Contributions

#### Setup Development Environment

```bash
# Clone the repository
git clone https://gitlab.com/theredhacker0345/Noor-connect.git
cd Noor-connect

# Install dependencies
npm install

# Run development server
npm run dev
```

#### Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Write meaningful commit messages
- Add comments for complex logic
- Ensure code is accessible and responsive

#### Testing

Before submitting a pull request:

- Test your changes on both web and mobile (if applicable)
- Ensure no console errors
- Test on different screen sizes
- Verify privacy features are not compromised

## 📝 Pull Request Process

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes with clear messages
4. Push to your fork (`git push origin feature/amazing-feature`)
5. Create a Pull Request on GitLab

### Pull Request Guidelines

- Keep PRs focused and small
- Link to related issues
- Update documentation if needed
- Ensure CI checks pass
- Be responsive to feedback

## 🏷️ Project Guidelines

### Privacy First

Noor Connect is built with privacy as a core principle. When contributing:

- Never add tracking or analytics
- Never send data to external servers
- All data must remain local
- No third-party services that compromise privacy

### Open Source Philosophy

- Keep the code clean and readable
- Document complex logic
- Help others understand your contributions
- Respect the GPL v3.0 license

### Performance

- Optimize for low-end devices
- Minimize bundle size
- Use lazy loading where appropriate
- Test on older Android devices if possible

## 📧 Getting Help

If you need help contributing:

- Open an issue with the `question` label
- Join our community discussions
- Check existing documentation

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Avoid offensive or derogatory language

Thank you for contributing to Noor Connect! May Allah reward your efforts. 🌙
