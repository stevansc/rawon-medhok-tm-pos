/**
 * Bluetooth Thermal Printer Service (ESC/POS)
 * Supports 58mm thermal printers via Web Bluetooth API.
 */

// Web Bluetooth API type declarations (not in standard DOM lib)
declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
        optionalServices?: string[];
        acceptAllDevices?: boolean;
      }): Promise<BluetoothDeviceCompat>;
    };
  }
}

interface BluetoothDeviceCompat {
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothGATTServerCompat>;
  };
}

interface BluetoothGATTServerCompat {
  getPrimaryService(uuid: string): Promise<BluetoothGATTServiceCompat>;
}

interface BluetoothGATTServiceCompat {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicCompat>;
}

interface BluetoothCharacteristicCompat {
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

// ESC/POS Command Constants
const ESC = 0x1B;
const GS = 0x1D;

// Common BLE Serial Service/Characteristic UUIDs for thermal printers
const PRINTER_SERVICE_UUIDS = [
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",  // Nordic UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",  // Common Chinese BLE printers
  "0000ff00-0000-1000-8000-00805f9b34fb",   // Generic serial
];

const PRINTER_WRITE_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43f4-a8d4-ecbe34729bb3",  // Nordic UART TX
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",  // Common write char
  "0000ff02-0000-1000-8000-00805f9b34fb",   // Generic write
];

interface PrinterConnection {
  device: BluetoothDeviceCompat;
  characteristic: BluetoothCharacteristicCompat;
}

let cachedConnection: PrinterConnection | null = null;

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function buildInit(): Uint8Array {
  return new Uint8Array([ESC, 0x40]);
}

function buildBold(on: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x45, on ? 0x01 : 0x00]);
}

function buildAlign(align: "left" | "center" | "right"): Uint8Array {
  const n = align === "left" ? 0x00 : align === "center" ? 0x01 : 0x02;
  return new Uint8Array([ESC, 0x61, n]);
}

function buildSize(n: number): Uint8Array {
  return new Uint8Array([GS, 0x21, n]);
}

function buildCut(): Uint8Array {
  return new Uint8Array([GS, 0x56, 0x00]);
}

function buildFeed(lines: number): Uint8Array {
  return new Uint8Array([ESC, 0x64, lines]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function formatLine(left: string, right: string, width: number = 32): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

function buildSeparator(width: number = 32): Uint8Array {
  return concat(encode("-".repeat(width) + "\n"));
}

export interface ReceiptData {
  branchName: string;
  invoiceNumber: string | number;
  tableNumber: number;
  customerName: string;
  cashierName: string;
  paymentMethod: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  discountReason?: string;
  totalAmount: number;
}

export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const W = 32;

  return concat(
    buildInit(),

    // Header
    buildAlign("center"),
    buildBold(true),
    buildSize(0x11),
    encode("RAWON TM\n"),
    buildSize(0x00),
    encode(data.branchName.toUpperCase() + "\n"),
    encode("SURABAYA, EAST JAVA\n"),
    buildBold(false),
    buildSeparator(W),

    // Order Info
    buildAlign("left"),
    encode(formatLine("INVOICE", "#" + data.invoiceNumber, W) + "\n"),
    encode(formatLine("TABLE", "TABLE " + data.tableNumber, W) + "\n"),
    encode(formatLine("CASHIER", data.cashierName.toUpperCase(), W) + "\n"),
    encode(formatLine("DATE", new Date(data.createdAt).toLocaleDateString(), W) + "\n"),
    buildSeparator(W),

    // Items
    ...data.items.flatMap(item => [
      encode(
        formatLine(
          `${item.quantity}x ${item.name.substring(0, 18)}`,
          item.price.toLocaleString("id-ID"),
          W
        ) + "\n"
      ),
    ]),
    buildSeparator(W),

    // Totals
    encode(formatLine("SUBTOTAL", "Rp " + (data.totalAmount - data.taxAmount).toLocaleString("id-ID"), W) + "\n"),
    encode(formatLine("TAX", "Rp " + data.taxAmount.toLocaleString("id-ID"), W) + "\n"),

    // Discount (conditional)
    ...(data.discountAmount && data.discountAmount > 0
      ? [
          buildBold(true),
          encode(formatLine("DISCOUNT", "- Rp " + data.discountAmount.toLocaleString("id-ID"), W) + "\n"),
          buildBold(false),
        ]
      : []),

    buildSeparator(W),

    // Grand Total
    buildBold(true),
    buildSize(0x01),
    encode(
      formatLine(
        "TOTAL",
        "Rp " + Math.max(0, data.totalAmount - (data.discountAmount || 0)).toLocaleString("id-ID"),
        W
      ) + "\n"
    ),
    buildSize(0x00),
    encode(formatLine("PAID VIA", data.paymentMethod.toUpperCase(), W) + "\n"),
    buildBold(false),
    buildSeparator(W),

    // Footer
    buildAlign("center"),
    buildBold(true),
    encode("SUWUN! MATUR NUWUN\n"),
    buildBold(false),
    encode("Thank you for dining with us!\n"),

    // Feed & Cut
    buildFeed(4),
    buildCut()
  );
}

export async function connectPrinter(): Promise<PrinterConnection> {
  if (cachedConnection && cachedConnection.device.gatt?.connected) {
    return cachedConnection;
  }

  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth is not supported in this browser. Use Chrome or Edge on HTTPS.");
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  if (!device.gatt) {
    throw new Error("Bluetooth GATT not available on this device.");
  }

  // A small delay helps on some Android devices before initiating GATT connect
  await new Promise(r => setTimeout(r, 500));

  let server;
  let attempts = 0;
  while (attempts < 3) {
    try {
      attempts++;
      server = await device.gatt.connect();
      break;
    } catch (err) {
      if (attempts >= 3) throw err;
      await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
    }
  }

  if (!server) {
    throw new Error("Failed to connect to printer GATT server after 3 attempts.");
  }

  for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      for (const charUuid of PRINTER_WRITE_CHARACTERISTIC_UUIDS) {
        try {
          const characteristic = await service.getCharacteristic(charUuid);
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            cachedConnection = { device, characteristic };
            return cachedConnection;
          }
        } catch {
          // Try next characteristic UUID
        }
      }
    } catch {
      // Try next service UUID
    }
  }

  throw new Error("Could not find a writable characteristic on the printer. Check printer model compatibility.");
}

export async function printBytes(connection: PrinterConnection, data: Uint8Array): Promise<void> {
  const CHUNK_SIZE = 100;

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (connection.characteristic.properties.writeWithoutResponse) {
      await connection.characteristic.writeValueWithoutResponse(chunk);
    } else {
      await connection.characteristic.writeValue(chunk);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const connection = await connectPrinter();
  const bytes = buildReceiptBytes(data);
  await printBytes(connection, bytes);
}

export interface KitchenTicketData {
  branchName: string;
  invoiceNumber: string | number;
  tableNumber: number;
  customerName: string;
  orderType: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    notes?: string;
  }>;
}

export function buildKitchenTicketBytes(data: KitchenTicketData): Uint8Array {
  const W = 32;
  return concat(
    buildInit(),
    buildAlign("center"),
    buildBold(true),
    buildSize(0x11), // Double height/width
    encode(`TABLE ${data.tableNumber}\n`),
    buildSize(0x00),
    encode(`TYPE: ${data.orderType.toUpperCase()}\n`),
    buildBold(false),
    buildSeparator(W),
    
    buildAlign("left"),
    encode(formatLine("ORDER", "#" + data.invoiceNumber, W) + "\n"),
    encode(formatLine("CUST", data.customerName.toUpperCase(), W) + "\n"),
    encode(formatLine("TIME", new Date(data.createdAt).toLocaleTimeString(), W) + "\n"),
    buildSeparator(W),
    
    // Items
    ...data.items.flatMap(item => {
      const lines = [
        buildBold(true),
        buildSize(0x01), // Double width
        encode(`${item.quantity}x ${item.name.toUpperCase()}\n`),
        buildSize(0x00),
        buildBold(false),
      ];
      if (item.notes) {
        lines.push(encode(`   Note: ${item.notes}\n`));
      }
      return lines;
    }),
    buildSeparator(W),
    
    buildAlign("center"),
    encode("-- END OF TICKET --\n"),
    
    buildFeed(4),
    buildCut()
  );
}

export async function printKitchenTicket(data: KitchenTicketData): Promise<void> {
  const connection = await connectPrinter();
  const bytes = buildKitchenTicketBytes(data);
  await printBytes(connection, bytes);
}

export function isPrinterConnected(): boolean {
  return !!(cachedConnection && cachedConnection.device.gatt?.connected);
}
