import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS

export function middleware(req: NextRequest) {
  const url = req.nextUrl

  // Excluir assets estáticos
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/favicon") || url.pathname.startsWith("/public")) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get("authorization")

  if (!authHeader?.startsWith("Basic ")) {
    return new Response("Auth required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Protected"',
      },
    })
  }

  const base64Credentials = authHeader.split(" ")[1]
  const [user, pass] = Buffer.from(base64Credentials, "base64").toString().split(":")

  if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS) {
    return NextResponse.next()
  }

  return new Response("Invalid credentials", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Protected"',
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
