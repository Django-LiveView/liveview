# Django LiveView

![Django LiveView](https://github.com/Django-LiveView/starter-template/raw/main/brand_assets/github%20social%20preview.jpg)

**Build real-time, reactive interfaces with Django using WebSockets — write Python, not JavaScript.**

Django LiveView is a framework for creating interactive, real-time web applications entirely in Python, inspired by [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) and [Laravel Livewire](https://laravel-livewire.com/).

Create rich, dynamic user experiences with server-rendered HTML without writing a single line of JavaScript. Perfect for Django developers who want real-time features without the complexity of a separate frontend framework.

## 💪 Superpowers

- **Create SPAs without using APIs** — No REST or GraphQL needed
- **Uses Django's template system** to render the frontend (without JavaScript frameworks)
- **Logic stays in Python** — No split between backend and frontend
- **Use all of Django's tools** — ORM, forms, authentication, admin, etc.
- **Everything is asynchronous by default** — Built on Django Channels
- **Zero learning curve** — If you know Python and Django, you're ready
- **Real-time by design** — All interactions happen over WebSockets

System components communicate through real-time events, where events represent important actions. Every component can produce and consume actions, allowing asynchronous and decoupled communication.

**LiveView is HTML over WebSockets** — a new way to build dynamic websites with Django.

---

## ✨ Features

- 🔄 **Real-time updates** via WebSockets
- 🎯 **Server-side rendering** — write Python, not JavaScript
- 🚀 **Auto-discovery** of LiveView components
- 🔌 **Simple decorator-based API**
- 📡 **Broadcast support** for multi-user updates
- 🎨 **Stimulus controller** included for advanced interactions
- 🔁 **Automatic reconnection** with exponential backoff
- 📦 **Batteries included** — JavaScript assets bundled
- 🧪 **Type hints** and modern Python
- 🌐 **Multi-language support** built-in
- 🎬 **Intersection Observer** for infinite scroll
- 🎯 **Auto-focus** for dynamic elements
- ⚡ **Threading support** for background tasks
- 🔒 **Middleware system** for authentication/authorization

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Created by [Andros Fenollosa](https://github.com/tanrax)

Inspired by:
- [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) (Elixir)
- [Laravel Livewire](https://laravel-livewire.com/) (PHP)

---

## 📬 Support

- **Documentation**: [GitHub README](https://github.com/tanrax/django-liveview#readme)
- **Issues**: [GitHub Issues](https://github.com/tanrax/django-liveview/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tanrax/django-liveview/discussions)
- **Mastodon**: [@andros@activity.andros.dev](https://activity.andros.dev/@andros)

---

**Made with ❤️ and Python**
