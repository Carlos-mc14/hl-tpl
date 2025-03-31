import crypto from "crypto"

// Endpoints de la API de PayU (sandbox/producción)
const PAYU_API_URL = process.env.PAYU_API_URL || "https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi"
const PAYU_REPORTS_URL = process.env.PAYU_REPORTS_URL || "https://sandbox.api.payulatam.com/reports-api/4.0/service.cgi"

// Credenciales del comercio para PayU Perú
const PAYU_MERCHANT_ID = process.env.PAYU_MERCHANT_ID
const PAYU_API_KEY = process.env.PAYU_API_KEY
const PAYU_API_LOGIN = process.env.PAYU_API_LOGIN
const PAYU_ACCOUNT_ID = process.env.PAYU_ACCOUNT_ID

// Configuración de moneda e idioma para Perú
const CURRENCY = "PEN" // Sol peruano
const LANGUAGE = "es" // Español

// Función para verificar si PayU está configurado correctamente
export function isPayUConfigured(): boolean {
  const configured = !!PAYU_API_URL && !!PAYU_MERCHANT_ID && !!PAYU_API_KEY && !!PAYU_API_LOGIN && !!PAYU_ACCOUNT_ID

  console.log("PayU configuration check:", {
    PAYU_API_URL_exists: !!PAYU_API_URL,
    PAYU_MERCHANT_ID_exists: !!PAYU_MERCHANT_ID,
    PAYU_API_KEY_exists: !!PAYU_API_KEY,
    PAYU_API_LOGIN_exists: !!PAYU_API_LOGIN,
    PAYU_ACCOUNT_ID_exists: !!PAYU_ACCOUNT_ID,
    configured,
  })

  return configured
}

// Función para obtener información de depuración sobre la configuración de PayU
export function getPayUDebugInfo() {
  return {
    PAYU_API_URL: PAYU_API_URL ? "Configurado" : "No configurado",
    PAYU_MERCHANT_ID: PAYU_MERCHANT_ID ? PAYU_MERCHANT_ID.substring(0, 3) + "..." : "No configurado",
    PAYU_API_KEY: PAYU_API_KEY ? PAYU_API_KEY.substring(0, 3) + "..." : "No configurado",
    PAYU_API_LOGIN: PAYU_API_LOGIN ? PAYU_API_LOGIN.substring(0, 3) + "..." : "No configurado",
    PAYU_ACCOUNT_ID: PAYU_ACCOUNT_ID ? PAYU_ACCOUNT_ID.substring(0, 3) + "..." : "No configurado",
    ENVIRONMENT: process.env.NODE_ENV || "development",
    IS_SANDBOX: PAYU_API_URL?.includes("sandbox") ? "Sí" : "No",
  }
}

// Función para generar la firma (signature) requerida
export function generateSignature(referenceCode: string, amount: number, currency: string = CURRENCY): string {
  if (!PAYU_API_KEY || !PAYU_MERCHANT_ID) {
    throw new Error("PayU API key o Merchant ID no configurados")
  }
  // Formato: API_KEY~MERCHANT_ID~REFERENCE_CODE~AMOUNT~CURRENCY
  const signatureString = `${PAYU_API_KEY}~${PAYU_MERCHANT_ID}~${referenceCode}~${amount}~${currency}`
  return crypto.createHash("md5").update(signatureString).digest("hex")
}

// Genera un código de referencia único para la transacción
export function generateReferenceCode(reservationId: string): string {
  const timestamp = Date.now()
  return `HOTEL_${reservationId}_${timestamp}`
}

// Actualizar la interfaz BuyerInfo para incluir todos los campos requeridos
interface BuyerInfo {
  firstName: string
  lastName: string
  email: string
  phone?: string
  dniNumber?: string
  shippingAddress?: {
    street1: string
    street2?: string
    city: string
    state: string
    country: string
    postalCode: string
    phone?: string
  }
}

// Interfaces para PayU
export interface PayUTransaction {
  order: {
    accountId: string
    referenceCode: string
    description: string
    language: string
    signature: string
    notifyUrl: string
    additionalValues: {
      TX_VALUE: {
        value: number
        currency: string
      }
    }
    buyer: {
      merchantBuyerId?: string
      fullName: string
      emailAddress: string
      contactPhone?: string
      dniNumber?: string
    }
    shippingAddress?: {
      street1: string
      street2?: string
      city: string
      state?: string
      country: string
      postalCode?: string
      phone?: string
    }
  }
  payer?: {
    merchantPayerId?: string
    fullName?: string
    emailAddress?: string
    contactPhone?: string
    dniNumber?: string
  }
  creditCard?: {
    number: string
    securityCode: string
    expirationDate: string
    name: string
  }
  extraParameters?: {
    INSTALLMENTS_NUMBER?: number
    RESPONSE_URL?: string
    PAYMENT_METHOD_TYPE?: string
    PAYMENT_METHOD?: string
    OTP?: string
  }
  type: string
  paymentMethod: string
  paymentCountry: string
  deviceSessionId?: string
  ipAddress: string
  cookie?: string
  userAgent?: string
}

// Función para crear una transacción de PayU
export function createPayUTransaction(data: {
  amount: number
  currency: string
  description: string
  referenceCode: string
  buyerEmail: string
  buyerName: string
  returnUrl: string
  paymentMethod: string
  cardData?: {
    number: string
    name: string
    expiryMonth: string
    expiryYear: string
    cvc: string
  }
  otpCode?: string
  ipAddress: string
  userAgent: string
  cookie: string
}): PayUTransaction {
  // Validar y limpiar la dirección IP
  // Si hay múltiples IPs (separadas por comas), tomar solo la primera
  let cleanIpAddress = data.ipAddress.split(",")[0].trim()
  // Asegurarse de que la IP no exceda 39 caracteres
  cleanIpAddress = cleanIpAddress.substring(0, 39)

  // Limpiar user agent y cookie para cumplir con las restricciones de PayU
  const cleanUserAgent = data.userAgent ? data.userAgent.substring(0, 255) : ""
  const cleanCookie = data.cookie ? data.cookie.substring(0, 255) : ""

  // Crear la transacción base
  const transaction: PayUTransaction = {
    order: {
      accountId: process.env.PAYU_ACCOUNT_ID || "",
      referenceCode: data.referenceCode,
      description: data.description,
      language: "es",
      signature: "", // Se calculará después
      notifyUrl: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
      additionalValues: {
        TX_VALUE: {
          value: data.amount,
          currency: data.currency,
        },
      },
      buyer: {
        fullName: data.buyerName,
        emailAddress: data.buyerEmail,
      },
    },
    type: "AUTHORIZATION_AND_CAPTURE",
    paymentMethod: data.paymentMethod,
    paymentCountry: "PE",
    ipAddress: cleanIpAddress,
    userAgent: cleanUserAgent,
    cookie: cleanCookie,
  }

  // Añadir parámetros adicionales según el método de pago
  transaction.extraParameters = {
    RESPONSE_URL: data.returnUrl,
  }

  // Si es tarjeta de crédito, añadir los datos de la tarjeta
  if (data.paymentMethod === "VISA" || data.paymentMethod === "MASTERCARD") {
    if (data.cardData) {
      transaction.creditCard = {
        number: data.cardData.number,
        securityCode: data.cardData.cvc,
        expirationDate: `${data.cardData.expiryYear}/${data.cardData.expiryMonth}`,
        name: data.cardData.name,
      }
    }
  }

  // Si es Yape, añadir el código OTP
  if (data.paymentMethod === "YAPE" && data.otpCode) {
    transaction.extraParameters.OTP = data.otpCode
  }

  return transaction
}

// Función para calcular la firma de PayU
export function calculateSignature(
  apiKey: string,
  merchantId: string,
  referenceCode: string,
  amount: number,
  currency: string,
): string {
  const crypto = require("crypto")
  const data = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`
  return crypto.createHash("md5").update(data).digest("hex")
}

// Función para enviar la transacción a PayU
export async function sendTransactionToPayU(transaction: PayUTransaction): Promise<any> {
  try {
    // Calcular la firma
    const apiKey = process.env.PAYU_API_KEY || ""
    const merchantId = process.env.PAYU_MERCHANT_ID || ""
    const referenceCode = transaction.order.referenceCode
    const amount = transaction.order.additionalValues.TX_VALUE.value
    const currency = transaction.order.additionalValues.TX_VALUE.currency

    transaction.order.signature = calculateSignature(apiKey, merchantId, referenceCode, amount, currency)

    // Enviar la transacción a PayU
    const payuApiUrl = process.env.PAYU_API_URL || ""

    console.log("Enviando transacción a PayU:", JSON.stringify(transaction, null, 2))

    const response = await fetch(`${payuApiUrl}/payments-api/4.0/service.cgi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": "es",
        Authorization: `Basic ${Buffer.from(`${process.env.PAYU_API_LOGIN}:${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        command: "SUBMIT_TRANSACTION",
        merchant: {
          apiKey,
          apiLogin: process.env.PAYU_API_LOGIN,
        },
        transaction,
        test: process.env.NODE_ENV !== "production",
      }),
    })

    const data = await response.json()
    console.log("Respuesta de PayU:", JSON.stringify(data, null, 2))

    return data
  } catch (error) {
    console.error("Error al enviar transacción a PayU:", error)
    throw error
  }
}

// Actualizar la función createPaymentRequest para usar el ID correcto en la firma
export function createPaymentRequest(
  reservationId: string,
  amount: number,
  buyerInfo: BuyerInfo,
  description: string,
  paymentMethod: string,
  redirectUrls: {
    returnUrl: string
    cancelUrl: string
  },
  installmentsNumber?: number,
  otpCode?: string,
  creditCardInfo?:
    | {
        number: any
        securityCode: any
        expirationDate: string
        name: any
      }
    | undefined,
  clientInfo?: {
    deviceSessionId?: string
    ipAddress?: string
    userAgent?: string
    cookie?: string
  },
) {
  if (!isPayUConfigured()) {
    console.error("Credenciales de PayU faltantes:", getPayUDebugInfo())
    throw new Error("Credenciales de PayU no configuradas")
  }

  const referenceCode = generateReferenceCode(reservationId)
  const signature = generateSignature(referenceCode, amount)

  // Define la dirección de envío del comprador. Si no se provee, se usa un objeto por defecto.
  const defaultAddress = {
    street1: "Dirección de facturación",
    street2: "",
    city: "Lima",
    state: "Lima",
    country: "PE",
    postalCode: "15000",
    phone: buyerInfo.phone || "",
  }
  const buyerAddress = buyerInfo.shippingAddress || defaultAddress

  // Crear objeto de parámetros extra
  const extraParameters: Record<string, string> = {
    RESPONSE_URL: redirectUrls.returnUrl,
    CONFIRMATION_URL: `${process.env.NEXTAUTH_URL || "https://hotel.nexius.lat"}/api/payments/webhook`,
  }

  // Añadir OTP para pagos con Yape
  if (paymentMethod === "YAPE" && otpCode) {
    extraParameters.OTP = otpCode
  }

  // Añadir número de cuotas para pagos con tarjeta
  if (installmentsNumber && ["VISA", "MASTERCARD", "AMEX", "DINERS"].includes(paymentMethod)) {
    extraParameters.INSTALLMENTS_NUMBER = installmentsNumber.toString()
  }

  // Calcular fecha de expiración (30 minutos desde ahora)
  const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  // Usar valores dinámicos proporcionados por el cliente o valores por defecto
  const deviceSessionId = clientInfo?.deviceSessionId || crypto.randomUUID()
  const ipAddress = clientInfo?.ipAddress || "127.0.0.1"
  const userAgent = clientInfo?.userAgent || "Mozilla/5.0"
  const cookie = clientInfo?.cookie || crypto.randomUUID()

  // Validar y truncar la información del cliente para cumplir con las restricciones de PayU
  const validatedIpAddress = ipAddress.length > 39 ? ipAddress.substring(0, 39) : ipAddress
  const validatedUserAgent = userAgent.length > 255 ? userAgent.substring(0, 255) : userAgent
  const validatedCookie = cookie.length > 255 ? cookie.substring(0, 255) : cookie

  // Crea la solicitud de pago con el formato requerido por la documentación actualizada
  const paymentRequest: any = {
    language: LANGUAGE,
    command: "SUBMIT_TRANSACTION",
    merchant: {
      apiKey: PAYU_API_KEY,
      apiLogin: PAYU_API_LOGIN,
    },
    transaction: {
      order: {
        accountId: PAYU_ACCOUNT_ID,
        referenceCode: referenceCode,
        description: description,
        language: LANGUAGE,
        signature: signature,
        notifyUrl: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
        additionalValues: {
          TX_VALUE: {
            value: amount,
            currency: CURRENCY,
          },
        },
        buyer: {
          merchantBuyerId: `buyer_${reservationId}`,
          fullName: `${buyerInfo.firstName} ${buyerInfo.lastName}`,
          emailAddress: buyerInfo.email,
          contactPhone: buyerInfo.phone ? buyerInfo.phone.replace(/\s+/g, "") : "",
          dniNumber: buyerInfo.dniNumber || "00000000",
          shippingAddress: {
            street1: buyerAddress.street1,
            street2: buyerAddress.street2 || "",
            city: buyerAddress.city,
            state: buyerAddress.state,
            country: buyerAddress.country,
            postalCode: buyerAddress.postalCode,
            phone: buyerAddress.phone ? (buyerInfo.phone?.replace(/\s+/g, "") ?? "") : "",
          },
        },
        // También se incluye una dirección de envío para la orden (se puede igualar a la del comprador)
        shippingAddress: {
          street1: buyerAddress.street1,
          street2: buyerAddress.street2 || "",
          city: buyerAddress.city,
          state: buyerAddress.state,
          country: buyerAddress.country,
          postalCode: buyerAddress.postalCode,
          phone: buyerAddress.phone ? buyerInfo.phone?.replace(/\s+/g, "") : "",
        },
      },
      extraParameters: extraParameters,
      // Añadir información del pagador (igual al comprador en este caso)
      payer: {
        merchantPayerId: `payer_${reservationId}`,
        fullName: `${buyerInfo.firstName} ${buyerInfo.lastName}`,
        emailAddress: buyerInfo.email,
        contactPhone: buyerInfo.phone ? buyerInfo.phone.replace(/\s+/g, "") : "",
        dniNumber: buyerInfo.dniNumber || "00000000",
        billingAddress: {
          street1: buyerAddress.street1,
          street2: buyerAddress.street2 || "",
          city: buyerAddress.city,
          state: buyerAddress.state,
          country: buyerAddress.country,
          postalCode: buyerAddress.postalCode,
          phone: buyerAddress.phone ? buyerInfo.phone?.replace(/\s+/g, "") : "",
        },
      },
      type: "AUTHORIZATION_AND_CAPTURE",
      paymentMethod: paymentMethod,
      expirationDate: expirationDate,
      paymentCountry: "PE",
      deviceSessionId: deviceSessionId,
      ipAddress: validatedIpAddress,
      cookie: validatedCookie,
      userAgent: validatedUserAgent,
    },
    test: process.env.NODE_ENV !== "production",
  }

  // Registro de depuración (puedes quitarlo en producción)
  console.log("Detalles de la solicitud PayU:", {
    merchantId: PAYU_MERCHANT_ID,
    apiLogin: PAYU_API_LOGIN,
    accountId: PAYU_ACCOUNT_ID,
    referenceCode,
    amount,
    currency: CURRENCY,
    signature,
    paymentMethod,
    returnUrl: redirectUrls.returnUrl,
    cancelUrl: redirectUrls.cancelUrl,
  })

  return paymentRequest
}

// Procesa el pago mediante la API de PayU
export async function processPayment(paymentData: any) {
  try {
    if (!isPayUConfigured()) {
      throw new Error("PayU no está configurado correctamente")
    }

    console.log("Enviando solicitud de pago a PayU:", JSON.stringify(paymentData, null, 2))
    const response = await fetch(PAYU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error en la respuesta de la API de PayU:", errorText)
      throw new Error(`Error en la API de PayU: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log("Respuesta de la API de PayU:", JSON.stringify(responseData, null, 2))
    return responseData
  } catch (error) {
    console.error("Error procesando el pago en PayU:", error)
    throw error
  }
}

// Verifica el estado de una transacción con PayU
export async function verifyPayment(orderId: string) {
  if (!isPayUConfigured()) {
    throw new Error("Credenciales de PayU no configuradas")
  }

  try {
    const requestData = {
      language: LANGUAGE,
      command: "ORDER_DETAIL",
      merchant: {
        apiKey: PAYU_API_KEY,
        apiLogin: PAYU_API_LOGIN,
      },
      details: {
        orderId,
      },
    }

    console.log("Enviando solicitud de verificación a PayU:", JSON.stringify(requestData, null, 2))

    const response = await fetch(PAYU_REPORTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error en la verificación con PayU:", errorText)
      throw new Error(`Error en la API de PayU: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log("Respuesta de verificación de PayU:", JSON.stringify(responseData, null, 2))
    return responseData
  } catch (error) {
    console.error("Error verificando el pago en PayU:", error)
    throw error
  }
}

// Procesa la notificación recibida vía webhook de PayU
export function parsePayUNotification(body: any) {
  // Verifica que se recibieron los campos mínimos necesarios
  if (!body || !body.reference_sale || !body.value || !body.currency || !body.state_pol) {
    console.error("Formato de notificación de PayU inválido:", body)
    return null
  }

  // Valida la firma para asegurar la autenticidad de la notificación
  if (PAYU_API_KEY && body.merchant_id && body.sign) {
    const expectedSignature = crypto
      .createHash("md5")
      .update(
        `${PAYU_API_KEY}~${body.merchant_id}~${body.reference_sale}~${body.value}~${body.currency}~${body.state_pol}`,
      )
      .digest("hex")

    if (body.sign !== expectedSignature) {
      console.error("Firma de notificación PayU inválida")
      return null
    }
  }

  // Mapea el estado de PayU a nuestro sistema
  let status: "Completed" | "Failed" | "Pending"
  switch (body.state_pol) {
    case "4": // Aprobado
      status = "Completed"
      break
    case "6": // Rechazado
    case "5": // Expirado
      status = "Failed"
      break
    default:
      status = "Pending"
  }

  return {
    transactionId: body.transaction_id || body.reference_pol || "",
    referenceCode: body.reference_sale,
    amount: Number.parseFloat(body.value),
    currency: body.currency,
    status,
  }
}

