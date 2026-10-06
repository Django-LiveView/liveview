# Django LiveView

![Django LiveView: build real-time apps, write Python, not JavaScript](https://raw.githubusercontent.com/Django-LiveView/liveview/main/docs/images/readme-header.png)

**Build real-time, reactive interfaces with Django using WebSockets — write Python, not JavaScript.**

Django LiveView is a framework for creating interactive, real-time web applications entirely in Python, inspired by [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) and [Laravel Livewire](https://laravel-livewire.com/).

Create rich, dynamic user experiences with server-rendered HTML without writing a single line of JavaScript. Perfect for Django developers who want real-time features without the complexity of a separate frontend framework.

---

## 📋 Requirements

- Python 3.10+
- Django 4.2+
- Redis (for Channels layer)
- Channels 4.0+

---

## 🚀 Quick Start

Get started in minutes! Follow our interactive tutorial:

**👉 [Quick Start Guide](https://django-liveview.andros.dev/quick-start/)**

The guide covers:
- Installation and setup
- Creating your first LiveView handler
- Building interactive components
- Real-time updates with WebSockets

---

## 📚 Documentation

Complete documentation is available at:

**👉 [https://django-liveview.andros.dev/docs/install/](https://django-liveview.andros.dev/docs/install/)**

Learn about:
- Handlers and frontend integration
- Forms and broadcasting
- Advanced features (infinite scroll, auto-focus, debounce)
- Browser history (back and forward buttons in SPA navigation)
- Error handling and testing
- Deployment strategies
- API reference and troubleshooting

Reference guides in this repository:
- [Quick Start](docs/QUICKSTART.md)
- [Frontend reference](docs/FRONTEND.md): `data-liveview-*` attributes, what handlers receive and every `send()` key
- [Browser history](docs/BROWSER_HISTORY.md): how back/forward restores pages, inline scripts, live widgets and form fields
- [Contributing](docs/CONTRIBUTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please see the [contribution guidelines](https://git.andros.dev/andros/contribute) for instructions on how to submit issues or pull requests.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ and Python**
