# Contributing to Django LiveView

Thank you for your interest in contributing to Django LiveView! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional. Harassment and discrimination of any kind will not be tolerated.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/tanrax/django-liveview/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Django/Python/Browser versions
   - Code samples if applicable

### Suggesting Features

1. Check if the feature has been requested in [Issues](https://github.com/tanrax/django-liveview/issues)
2. Create a new issue with:
   - Clear description of the feature
   - Use cases
   - Potential implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Redis
- Git

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/django-liveview.git
cd django-liveview

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -e ".[dev]"

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running Tests

```bash
# Python tests
pytest

# With coverage
pytest --cov=django_liveview --cov-report=html

# Specific test
pytest tests/test_decorators.py::test_handler_registration
```

### Code Quality

```bash
# Format code with Black
black django_liveview tests

# Lint with Ruff
ruff check django_liveview tests

# Type check with mypy
mypy django_liveview
```

### Building JavaScript

```bash
cd frontend

# Development build
npm run build

# Production build
npm run build:min

# Watch mode
npm run watch
```

## Project Structure

```
django-liveview/
├── django_liveview/       # Main Python package
│   ├── __init__.py
│   ├── apps.py            # App configuration
│   ├── consumers.py       # WebSocket consumer
│   ├── decorators.py      # Handler decorators
│   ├── connections.py     # Connection utilities
│   ├── routing.py         # URL routing helpers
│   └── static/            # Built JavaScript assets
├── frontend/              # JavaScript source
│   ├── controllers/
│   ├── mixins/
│   ├── main.js
│   └── webSocketsCli.js
├── tests/                 # Python tests
├── docs/                  # Documentation
└── examples/              # Example projects
```

## Coding Standards

### Python

- Follow PEP 8
- Use type hints
- Write docstrings for public APIs
- Keep functions small and focused
- Use meaningful variable names

```python
def send(consumer, data: dict, broadcast: bool = False):
    """
    Send a message to the consumer or broadcast it.

    Args:
        consumer: WebSocket consumer instance
        data: Message data to send
        broadcast: Whether to broadcast to all clients

    Raises:
        ValueError: If consumer is None when not broadcasting
    """
    pass
```

### JavaScript

- Use ES6+ features
- Document complex functions
- Keep functions pure when possible
- Use meaningful variable names
- Handle errors gracefully

```javascript
/**
 * Connect to WebSocket server
 * @param {string} url - WebSocket URL (optional)
 * @return {WebSocket} WebSocket instance
 */
export function connect(url = null) {
    // Implementation
}
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for custom WebSocket paths
fix: resolve reconnection race condition
docs: update installation instructions
test: add tests for middleware system
refactor: simplify handler registration
```

## Documentation

- Update README.md for user-facing changes
- Add docstrings to new Python functions
- Update CHANGELOG.md
- Create/update docs in `docs/` for major features

## Testing Guidelines

### Write Tests For

- New features
- Bug fixes
- Edge cases
- Error handling

### Test Structure

```python
# tests/test_feature.py
import pytest
from django_liveview import liveview_handler, send

class TestFeature:
    def test_basic_functionality(self):
        """Test basic feature behavior"""
        # Arrange
        # Act
        # Assert
        pass

    def test_edge_case(self):
        """Test edge case handling"""
        pass

    def test_error_handling(self):
        """Test error handling"""
        with pytest.raises(ValueError):
            # Code that should raise ValueError
            pass
```

## Release Process

(For maintainers)

1. Update version in `pyproject.toml` and `setup.py`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.x.x`
4. Push tag: `git push origin v0.x.x`
5. Build package: `python -m build`
6. Publish to PyPI: `twine upload dist/*`
7. Create GitHub release

## Questions?

Feel free to ask questions in:
- GitHub Issues
- Pull Request comments
- Discussions (if enabled)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
