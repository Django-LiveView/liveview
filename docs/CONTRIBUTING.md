# Contributing to Django LiveView

Thank you for your interest in contributing to Django LiveView! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional. Harassment and discrimination of any kind will not be tolerated.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Django-LiveView/liveview/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Django/Python/Browser versions
   - Code samples if applicable

### Suggesting Features

1. Check if the feature has been requested in [Issues](https://github.com/Django-LiveView/liveview/issues)
2. Create a new issue with:
   - Clear description of the feature
   - Use cases
   - Potential implementation approach

### Sending Changes

Pull requests are disabled on GitHub. Send your changes as patches by email,
following the [contribution guidelines](https://git.andros.dev/andros/contribute):

1. Clone the repository
2. Make your changes
3. Write/update tests
4. Update documentation and `CHANGELOG.md`
5. Commit with clear messages
6. Generate the patches (`git format-patch origin/main`) and send them

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Redis
- Git

### Setup

```bash
git clone https://github.com/Django-LiveView/liveview.git
cd liveview

# Create the virtual environment and install development dependencies
uv sync --extra dev
# Or, without uv: python -m venv .venv && pip install -e ".[dev]"

# Install the git hooks (ruff check and ruff format on every commit)
uv run pre-commit install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running Tests

Unit tests (Python, no Redis needed: they use the in-memory channel layer):

```bash
uv run pytest

# Specific test
uv run pytest tests/test_decorators.py::test_register_stores_handler_by_name
```

Browser tests (Playwright) for the navigation history, against the demo
project in `tests/e2e`, using Docker:

```bash
cd tests/e2e
docker compose run --rm e2e
```

See `tests/e2e/README.md` for details.

### Code Quality

```bash
# Lint and format (also run by the pre-commit hook)
uv run ruff check --fix .
uv run ruff format .

# Run every hook on all files
uv run pre-commit run --all-files

# Type check
uv run mypy liveview
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
├── liveview/              # Main Python package
│   ├── __init__.py
│   ├── apps.py            # App configuration
│   ├── consumers.py       # WebSocket consumer
│   ├── decorators.py      # Handler decorators
│   ├── connections.py     # Connection utilities
│   ├── routing.py         # URL routing helpers
│   ├── py.typed           # PEP 561 typing marker
│   └── static/            # Built JavaScript assets
├── frontend/              # JavaScript source
│   ├── controllers/
│   ├── mixins/
│   ├── main.js
│   └── webSocketsCli.js
├── tests/                 # Python unit tests
│   └── e2e/               # Demo project and browser tests
└── docs/                  # Documentation
```

## Coding Standards

### Python

- Follow PEP 8
- Use type hints
- Write docstrings for public APIs
- Keep functions small and focused
- Use meaningful variable names

```python
def send(consumer: Any, data: dict[str, Any], broadcast: bool = False) -> None:
    """
    Send a message to the consumer or broadcast it.

    Args:
        consumer: WebSocket consumer instance (can be None when broadcasting)
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

Plain pytest functions, one behaviour per test, split in Given / When / Then
blocks. Shared fixtures live in `tests/conftest.py`.

```python
# tests/test_feature.py
import pytest

from liveview import send


def test_basic_functionality(registry, consumer):
    # Given
    handler = registry.register("greet")(lambda consumer, content: "hello")

    # When
    result = handler(consumer, {})

    # Then
    assert result == "hello"


def test_error_handling(consumer):
    # Given
    consumer = None

    # When / Then
    with pytest.raises(ValueError):
        send(consumer, {})
```

## Release Process

(For maintainers)

1. Update version in `pyproject.toml`, `setup.py` and `liveview/__init__.py`
   (`tests/test_version.py` checks they match)
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
