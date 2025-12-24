# 🚀 Dropi MCP Server

[![npm version](https://badge.fury.io/js/dropi-mcp.svg)](https://www.npmjs.com/package/dropi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Conecta **Claude Desktop**, **ChatGPT**, **Cursor** y otros asistentes de IA con la plataforma de dropshipping **[Dropi.co](https://dropi.co)**.

> 🎯 Creado por [Trucos Ecomm & Drop](https://www.youtube.com/@trucosecommydrop) - La comunidad de dropshipping #1 de Colombia

---

## ✨ ¿Qué puedes hacer?

| Acción | Descripción |
|--------|-------------|
| 📦 **Crear pedidos** | Subir órdenes directamente a Dropi |
| 📋 **Listar órdenes** | Ver todas tus órdenes con filtros |
| 🔍 **Buscar pedidos** | Por ID, guía, estado, fecha, cliente |
| 🏷️ **Generar guías** | Individual o masivamente |
| ❌ **Cancelar órdenes** | Cambiar estado a cancelado |
| 💰 **Ver wallet** | Balance actual y movimientos |
| 🚚 **Cotizar envíos** | Precio de flete entre ciudades |
| 📍 **Ciudades/Departamentos** | Consultar ubicaciones disponibles |
| 🏢 **Transportadoras** | Ver transportadoras disponibles |
| 🛍️ **Productos** | Listar tus productos en Dropi |

---

## 📦 Instalación Rápida

### Opción 1: NPX (Recomendado)

No necesitas instalar nada, solo configura Claude Desktop:

```json
{
  "mcpServers": {
    "dropi": {
      "command": "npx",
      "args": ["-y", "dropi-mcp"],
      "env": {
        "DROPI_EMAIL": "tu_email@ejemplo.com",
        "DROPI_PASSWORD": "tu_contraseña"
      }
    }
  }
}
```

### Opción 2: Instalación Global

```bash
npm install -g dropi-mcp
```

```json
{
  "mcpServers": {
    "dropi": {
      "command": "dropi-mcp",
      "env": {
        "DROPI_EMAIL": "tu_email@ejemplo.com",
        "DROPI_PASSWORD": "tu_contraseña"
      }
    }
  }
}
```

### Opción 3: Desde el código fuente

```bash
git clone https://github.com/AndresestradaR/dropi-mcp.git
cd dropi-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "dropi": {
      "command": "node",
      "args": ["/ruta/completa/a/dropi-mcp/dist/index.js"],
      "env": {
        "DROPI_EMAIL": "tu_email@ejemplo.com",
        "DROPI_PASSWORD": "tu_contraseña"
      }
    }
  }
}
```

---

## ⚙️ Configuración Claude Desktop

1. Abre Claude Desktop
2. Ve a **Settings** → **Developer** → **Edit Config**
3. Agrega la configuración del MCP
4. Reinicia Claude Desktop

**Ubicación del archivo:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

---

## 🎮 Ejemplos de Uso

```
"Muéstrame mis pedidos de hoy"
"¿Cuántas órdenes tengo pendientes?"
"Busca el pedido con guía 123456789"
"Crea un pedido para Juan Pérez en Bogotá..."
"Genera guía para la orden 567890"
"¿Cuánto tengo en mi wallet de Dropi?"
"Lista mis productos en Dropi"
```

---

## 🛠️ Tools Disponibles

| Tool | Descripción |
|------|-------------|
| `dropi_login` | Autenticarse y verificar conexión |
| `dropi_get_departments` | Listar departamentos |
| `dropi_get_cities` | Listar ciudades de un departamento |
| `dropi_create_order` | Crear nuevo pedido |
| `dropi_get_order` | Obtener pedido por ID |
| `dropi_get_order_by_guide` | Obtener pedido por número de guía |
| `dropi_get_orders` | Listar pedidos con filtros |
| `dropi_generate_guide` | Generar guía para un pedido |
| `dropi_generate_guides_massive` | Generar guías masivamente |
| `dropi_cancel_order` | Cancelar un pedido |
| `dropi_get_wallet_balance` | Ver balance del wallet |
| `dropi_get_wallet_history` | Ver movimientos del wallet |
| `dropi_get_transport_companies` | Listar transportadoras |
| `dropi_get_shipping_quote` | Cotizar costo de envío |
| `dropi_get_products` | Listar productos disponibles |

---

## 🔐 Seguridad

- Tus credenciales se almacenan **localmente** en tu computadora
- El MCP corre **localmente**, no en servidores externos
- La comunicación con Dropi usa **HTTPS**

---

## 🤝 Compatibilidad

- ✅ Claude Desktop
- ✅ ChatGPT Desktop (con plugins MCP)
- ✅ Cursor IDE
- ✅ Continue.dev
- ✅ Cualquier cliente MCP

---

## 📚 Recursos

- 🎥 [Tutorial en YouTube](https://www.youtube.com/@trucosecommydrop)
- 💬 [Comunidad Trucos Ecomm & Drop](https://trucosecomm.com)
- 🤖 [Lucid Analytics](https://lucid-analytics-frontend.vercel.app) - BI para Dropshipping

---

## 📄 Licencia

MIT License - Úsalo libremente en tus proyectos.

---

Desarrollado con ❤️ por **[Trucos Ecomm & Drop](https://www.youtube.com/@trucosecommydrop)**

Si te sirvió, dale ⭐ al repo y suscríbete al canal!
