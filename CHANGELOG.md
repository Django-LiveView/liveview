# Changelog

All notable changes to Django LiveView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.9] - 2026-01-07

### Added
- **Keyboard Events Support**: New `data-liveview-keyboard-map` attribute for declarative keyboard shortcut handling
- Support for letter keys (a-z), number keys (0-9), and special keys (esc, enter, space, tab, arrows, etc.)
- Support for modifier keys: ctrl, alt, meta (Command/Windows), shift
- Support for key combinations like ctrl+s, alt+f, meta+k, ctrl+shift+p
- Automatic focus management for keyboard-enabled elements
- Dynamic element support via MutationObserver for keyboard maps
- Proper cleanup of keyboard event listeners on disconnect
- Scoped keyboard shortcuts (global on body or local on specific elements)

### Changed
- Updated rollup configuration to output to liveview/static directory
- Improved frontend controller with keyboard event normalization

## [2.1.4] - 2025-12-06

### Added
- **Auto-generated UUID room IDs**: If no `data-room` attribute is specified in the HTML, the framework now automatically generates a cryptographically random UUID for each user
- UUID generation uses native `crypto.randomUUID()` API when available (HTTPS), with fallback polyfill for older browsers or HTTP contexts
- Room IDs are now persisted in localStorage across page reloads

### Changed
- **Security Improvement**: Default behavior now uses random UUIDs instead of requiring manual room ID configuration
- Updated documentation with comprehensive security best practices section
- `data-room` attribute is now optional - recommended to omit for automatic UUID generation

### Security
- **CRITICAL**: Addressed potential IDOR (Insecure Direct Object Reference) vulnerability when using predictable room IDs like user IDs
- Documentation now includes warnings about security risks of predictable room IDs
- Added security best practices guide explaining room ID security implications

## [2.0.0] - 2025-11-20

### Changed
- **BREAKING:** Module name changed from `django_liveview` to `liveview` for cleaner imports
- **BREAKING:** Import paths changed from `from django_liveview` to `from liveview`
- **BREAKING:** INSTALLED_APPS now uses `"liveview"` instead of `"django_liveview"`
- **BREAKING:** Static files path changed from `static/django_liveview/` to `static/liveview/`
- Improved routing with `get_liveview_urlpatterns()` helper function
- JavaScript assets now bundled within the package
- Complete package restructure for distribution via pip/PyPI
- Comprehensive documentation with 13+ feature examples

### Note
- Package name on PyPI remains `django-liveview`
- This provides cleaner imports: `from liveview import liveview_handler, send`

### Added
- Professional package structure with pyproject.toml
- Comprehensive documentation (README, QUICKSTART, MIGRATION_GUIDE)
- Git repository with semantic versioning
- Static assets included in package

### Migration Guide
See MIGRATION_GUIDE.md for detailed migration instructions from v0.1.0

## [0.1.0] - 2025-11-12

### Added
- Initial release of Django LiveView
- Core decorator-based handler system (`@liveview_handler`)
- WebSocket consumer with auto-discovery of components
- JavaScript client with automatic reconnection
- Stimulus controller for page interactions
- Intersection Observer support for infinite scroll and lazy loading
- Auto-focus functionality for dynamic elements
- Init functions for component initialization
- Broadcast support for multi-user updates
- Multi-language support (i18n)
- Form data extraction and validation
- Custom data attributes support
- Middleware system for handlers
- Type hints throughout the codebase
- Comprehensive documentation and examples
- Bundled JavaScript assets (minified and source)
- Python package configuration (pyproject.toml, setup.py)
- Test configuration
- MIT License

### Features
- Real-time bidirectional communication via WebSockets
- Server-side rendering with Python/Django
- No heavy JavaScript framework required
- Automatic camelCase ↔ snake_case conversion
- Exponential backoff reconnection strategy
- Message queuing during disconnection
- Network status detection
- Browser history management
- Scroll management (smooth scroll, scroll to top)
- Dynamic HTML updates (replace, append, remove)
- Custom routing configuration support

[2.0.0]: https://github.com/tanrax/django-liveview/releases/tag/v2.0.0
[0.1.0]: https://github.com/tanrax/django-liveview/releases/tag/v0.1.0
