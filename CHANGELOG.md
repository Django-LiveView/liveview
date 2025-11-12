# Changelog

All notable changes to Django LiveView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-12

### Changed
- **BREAKING:** Package renamed from `liveview` to `django_liveview`
- **BREAKING:** Import paths changed from `from liveview.` to `from django_liveview.`
- Improved routing with `get_liveview_urlpatterns()` helper function
- JavaScript assets now bundled within the package
- Complete package restructure for distribution via pip/PyPI

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
