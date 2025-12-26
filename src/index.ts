#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

// WHITE_BRAND_ID configurable: "1" para Colombia, hash para Guatemala
const WHITE_BRAND_ID = process.env.DROPI_WHITE_BRAND_ID || "1";

// Detectar país por URL o variable de entorno
const DROPI_COUNTRY = process.env.DROPI_COUNTRY || "co";
const BASE_URLS: Record<string, string> = {
  co: "https://api.dropi.co",
  gt: "https://api.dropi.gt",
  mx: "https://api.dropi.mx"
};

interface DropiConfig { email: string; password: string; baseUrl: string; token?: string; wallet?: any; }

// Función para obtener IP pública (fallback a IP local)
async function getPublicIP(): Promise<string> {
  try {
    const response = await axios.get("https://api.ipify.org?format=json", { timeout: 3000 });
    return response.data.ip;
  } catch {
    return "127.0.0.1";
  }
}

class DropiClient {
  private config: DropiConfig;
  private client: AxiosInstance;

  constructor() {
    const baseUrl = process.env.DROPI_API_URL || BASE_URLS[DROPI_COUNTRY] || BASE_URLS.co;
    this.config = { 
      email: process.env.DROPI_EMAIL || "", 
      password: process.env.DROPI_PASSWORD || "", 
      baseUrl 
    };
    this.client = axios.create({ 
      baseURL: this.config.baseUrl, 
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Origin": this.config.baseUrl.replace("api.", "app."),
        "Referer": this.config.baseUrl.replace("api.", "app.") + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site"
      } 
    });
  }

  private async ensureAuthenticated(): Promise<void> { if (!this.config.token) await this.login(); }

  async login(): Promise<any> {
    try {
      // Debug: verificar que las credenciales llegaron
      const emailReceived = this.config.email || "(vacío)";
      const passwordReceived = this.config.password ? `${this.config.password.substring(0, 3)}***` : "(vacío)";
      
      if (!this.config.email || !this.config.password) {
        return { 
          success: false, 
          message: "Credenciales no configuradas",
          debug: {
            email_received: emailReceived,
            password_received: passwordReceived,
            white_brand_id: WHITE_BRAND_ID,
            base_url: this.config.baseUrl,
            hint: "Verifica que DROPI_EMAIL y DROPI_PASSWORD estén en las variables de entorno del MCP"
          }
        };
      }

      // Obtener IP pública para el payload
      const ipAddress = await getPublicIP();

      // Determinar si white_brand_id es número o string (hash)
      const whiteBrandId = /^\d+$/.test(WHITE_BRAND_ID) ? parseInt(WHITE_BRAND_ID) : WHITE_BRAND_ID;
      
      const payload = { 
        email: this.config.email, 
        password: this.config.password, 
        white_brand_id: whiteBrandId,
        brand: "",
        otp: null,
        with_cdc: false,
        ipAddress: ipAddress
      };
      
      const response = await this.client.post("/api/login", payload);
      
      if (response.data.isSuccess) {
        this.config.token = response.data.token;
        this.config.wallet = response.data.wallets?.[0] || response.data.wallet;
        this.client.defaults.headers.common["Authorization"] = `Bearer ${this.config.token}`;
        return { 
          success: true, 
          message: "Login exitoso", 
          wallet_balance: this.config.wallet?.amount || 0, 
          currency: this.config.wallet?.currency || "COP",
          user: response.data.user?.name || response.data.objects?.name 
        };
      }
      return { 
        success: false, 
        message: response.data.message || "Error en login",
        debug: {
          email_received: emailReceived,
          white_brand_id: WHITE_BRAND_ID,
          base_url: this.config.baseUrl,
          ip_used: ipAddress
        }
      };
    } catch (error: any) { 
      return { 
        success: false, 
        message: error.response?.data?.message || error.message,
        debug: {
          email_received: this.config.email || "(vacío)",
          password_received: this.config.password ? "***configurado***" : "(vacío)",
          white_brand_id: WHITE_BRAND_ID,
          base_url: this.config.baseUrl,
          error_detail: error.response?.status || "network error",
          error_data: error.response?.data || null
        }
      }; 
    }
  }

  async getDepartments(): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.get("/api/department")).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getCities(departmentId: number, rateType: string = ""): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.post("/api/trajectory/bycity", { department_id: departmentId, rate_type: rateType })).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async createOrder(orderData: any): Promise<any> {
    await this.ensureAuthenticated();
    try {
      const payload = { 
        calculate_costs_and_shiping: true, 
        state: orderData.state, 
        city: orderData.city, 
        name: orderData.name, 
        surname: orderData.surname, 
        dir: orderData.address, 
        phone: orderData.phone, 
        client_email: orderData.email || "", 
        notes: orderData.notes || "", 
        payment_method_id: 1, 
        rate_type: orderData.rate_type || "CON RECAUDO", 
        type: "FINAL_ORDER", 
        total_order: orderData.total_order, 
        products: orderData.products, 
        ...(orderData.dni && { dni: orderData.dni }), 
        ...(orderData.distribution_company_id && { distributionCompany: { id: orderData.distribution_company_id } }) 
      };
      return (await this.client.post("/api/orders/myorders", payload)).data;
    } catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getOrder(orderId: number): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.get(`/api/orders/myorders/${orderId}?warranty=false`)).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getOrderByGuide(guideNumber: string): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.get(`/api/orders/myorderbyguide/${guideNumber}`)).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getOrders(filters: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.until) params.append("until", filters.until);
      if (filters.status) params.append("status", filters.status);
      if (filters.result_number) params.append("result_number", filters.result_number.toString());
      if (filters.start) params.append("start", filters.start.toString());
      if (filters.textToSearch) params.append("textToSearch", filters.textToSearch);
      if (filters.filter_date_by) params.append("filter_date_by", filters.filter_date_by);
      params.append("orderBy", filters.orderBy || "id");
      params.append("orderDirection", filters.orderDirection || "desc");
      return (await this.client.get(`/api/orders/myorders?${params.toString()}`)).data;
    } catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async updateOrderStatus(orderId: number, status: string): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.put(`/api/orders/myorders/${orderId}`, { status })).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async generateGuide(orderId: number): Promise<any> { return this.updateOrderStatus(orderId, "GUIA_GENERADA"); }

  async generateGuidesMassive(orderIds: number[]): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.post("/api/orders/myorder/masive", orderIds.map(id => ({ id, status: "GUIA_GENERADA" })))).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getWalletHistory(filters: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.until) params.append("until", filters.until);
      if (filters.type) params.append("type", filters.type);
      if (filters.result_number) params.append("result_number", filters.result_number.toString());
      if (filters.start) params.append("start", filters.start.toString());
      params.append("orderBy", filters.orderBy || "id");
      params.append("orderDirection", filters.orderDirection || "desc");
      return (await this.client.get(`/api/historywallet?${params.toString()}`)).data;
    } catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getWalletBalance(): Promise<any> { 
    await this.ensureAuthenticated(); 
    return { 
      success: true, 
      balance: this.config.wallet?.amount || 0, 
      currency: this.config.wallet?.currency || "COP" 
    }; 
  }

  async getTransportCompanies(): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.get("/api/distribution_companies")).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getShippingQuote(params: { originDaneCode: string; destinationDaneCode: string; amount: number; withCollection: boolean }): Promise<any> {
    await this.ensureAuthenticated();
    try { return (await this.client.post("/api/orders/cotizaEnvioTransportadoraV2", { EnvioConCobro: params.withCollection, amount: params.amount, ciudad_destino: { cod_dane: params.destinationDaneCode }, ciudad_remitente: { cod_dane: params.originDaneCode } })).data; }
    catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async getProducts(filters: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    try {
      const params = new URLSearchParams();
      if (filters.result_number) params.append("result_number", filters.result_number.toString());
      if (filters.start) params.append("start", filters.start.toString());
      if (filters.textToSearch) params.append("textToSearch", filters.textToSearch);
      return (await this.client.get(`/api/products/myproducts?${params.toString()}`)).data;
    } catch (error: any) { return { success: false, message: error.response?.data?.message || error.message }; }
  }

  async cancelOrder(orderId: number): Promise<any> { return this.updateOrderStatus(orderId, "CANCELADO"); }
}

const TOOLS: Tool[] = [
  { name: "dropi_login", description: "Autenticarse en Dropi y obtener el balance del wallet", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "dropi_get_departments", description: "Obtener lista de departamentos disponibles para envio", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "dropi_get_cities", description: "Obtener lista de ciudades de un departamento", inputSchema: { type: "object", properties: { department_id: { type: "number", description: "ID del departamento" }, rate_type: { type: "string", description: "CON RECAUDO o SIN RECAUDO", enum: ["CON RECAUDO", "SIN RECAUDO", ""] } }, required: ["department_id"] } },
  { name: "dropi_create_order", description: "Crear un nuevo pedido en Dropi", inputSchema: { type: "object", properties: { state: { type: "string", description: "Departamento destino" }, city: { type: "string", description: "Ciudad destino" }, name: { type: "string", description: "Nombre cliente" }, surname: { type: "string", description: "Apellido cliente" }, address: { type: "string", description: "Direccion entrega" }, phone: { type: "string", description: "Telefono cliente" }, email: { type: "string", description: "Email (opcional)" }, notes: { type: "string", description: "Notas (opcional)" }, total_order: { type: "number", description: "Total orden" }, rate_type: { type: "string", enum: ["CON RECAUDO", "SIN RECAUDO"], default: "CON RECAUDO" }, dni: { type: "string", description: "Cedula (opcional)" }, distribution_company_id: { type: "number", description: "ID transportadora (opcional)" }, products: { type: "array", items: { type: "object", properties: { id: { type: "number" }, price: { type: "number" }, quantity: { type: "number" }, variation_id: { type: "number" } }, required: ["id", "price", "quantity"] } } }, required: ["state", "city", "name", "surname", "address", "phone", "total_order", "products"] } },
  { name: "dropi_get_order", description: "Obtener detalles de una orden por ID", inputSchema: { type: "object", properties: { order_id: { type: "number", description: "ID de la orden" } }, required: ["order_id"] } },
  { name: "dropi_get_order_by_guide", description: "Obtener orden por numero de guia", inputSchema: { type: "object", properties: { guide_number: { type: "string", description: "Numero de guia" } }, required: ["guide_number"] } },
  { name: "dropi_get_orders", description: "Listar ordenes con filtros", inputSchema: { type: "object", properties: { from: { type: "string", description: "Fecha desde YYYY-MM-DD" }, until: { type: "string", description: "Fecha hasta YYYY-MM-DD" }, status: { type: "string", enum: ["PENDIENTE", "GUIA_GENERADA", "EN_RUTA", "ENTREGADO", "DEVOLUCION", "CANCELADO", "NO_EFECTIVO"] }, result_number: { type: "number", default: 50 }, start: { type: "number", default: 0 }, textToSearch: { type: "string" }, filter_date_by: { type: "string", enum: ["FECHA DE CREADO", "FECHA DE PRIMERA IMPRESION", "FECHA DE CAMBIO DE ESTATUS"], default: "FECHA DE CREADO" } }, required: [] } },
  { name: "dropi_generate_guide", description: "Generar guia de transporte para una orden", inputSchema: { type: "object", properties: { order_id: { type: "number", description: "ID de la orden" } }, required: ["order_id"] } },
  { name: "dropi_generate_guides_massive", description: "Generar guias masivamente", inputSchema: { type: "object", properties: { order_ids: { type: "array", items: { type: "number" }, description: "Lista de IDs" } }, required: ["order_ids"] } },
  { name: "dropi_cancel_order", description: "Cancelar una orden", inputSchema: { type: "object", properties: { order_id: { type: "number", description: "ID de la orden" } }, required: ["order_id"] } },
  { name: "dropi_get_wallet_balance", description: "Obtener balance del wallet", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "dropi_get_wallet_history", description: "Obtener historial del wallet", inputSchema: { type: "object", properties: { from: { type: "string" }, until: { type: "string" }, type: { type: "string", enum: ["ENTRADA", "SALIDA"] }, result_number: { type: "number", default: 50 } }, required: [] } },
  { name: "dropi_get_transport_companies", description: "Obtener transportadoras disponibles", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "dropi_get_shipping_quote", description: "Cotizar costo de envio", inputSchema: { type: "object", properties: { origin_dane_code: { type: "string", description: "Codigo DANE origen" }, destination_dane_code: { type: "string", description: "Codigo DANE destino" }, amount: { type: "number", description: "Valor total" }, with_collection: { type: "boolean", default: true } }, required: ["origin_dane_code", "destination_dane_code", "amount"] } },
  { name: "dropi_get_products", description: "Obtener lista de productos", inputSchema: { type: "object", properties: { result_number: { type: "number", default: 50 }, start: { type: "number", default: 0 }, textToSearch: { type: "string" } }, required: [] } }
];

const dropiClient = new DropiClient();
const server = new Server({ name: "dropi-mcp", version: "1.0.3" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result: any;
    switch (name) {
      case "dropi_login": result = await dropiClient.login(); break;
      case "dropi_get_departments": result = await dropiClient.getDepartments(); break;
      case "dropi_get_cities": result = await dropiClient.getCities(args?.department_id as number, args?.rate_type as string); break;
      case "dropi_create_order": result = await dropiClient.createOrder(args); break;
      case "dropi_get_order": result = await dropiClient.getOrder(args?.order_id as number); break;
      case "dropi_get_order_by_guide": result = await dropiClient.getOrderByGuide(args?.guide_number as string); break;
      case "dropi_get_orders": result = await dropiClient.getOrders(args || {}); break;
      case "dropi_generate_guide": result = await dropiClient.generateGuide(args?.order_id as number); break;
      case "dropi_generate_guides_massive": result = await dropiClient.generateGuidesMassive(args?.order_ids as number[]); break;
      case "dropi_cancel_order": result = await dropiClient.cancelOrder(args?.order_id as number); break;
      case "dropi_get_wallet_balance": result = await dropiClient.getWalletBalance(); break;
      case "dropi_get_wallet_history": result = await dropiClient.getWalletHistory(args || {}); break;
      case "dropi_get_transport_companies": result = await dropiClient.getTransportCompanies(); break;
      case "dropi_get_shipping_quote": result = await dropiClient.getShippingQuote({ originDaneCode: args?.origin_dane_code as string, destinationDaneCode: args?.destination_dane_code as string, amount: args?.amount as number, withCollection: args?.with_collection !== false }); break;
      case "dropi_get_products": result = await dropiClient.getProducts(args || {}); break;
      default: return { content: [{ type: "text", text: `Tool desconocido: ${name}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error: any) { return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true }; }
});

async function main() { const transport = new StdioServerTransport(); await server.connect(transport); console.error("Dropi MCP Server running - By Trucos Ecomm & Drop"); }
main().catch(console.error);
