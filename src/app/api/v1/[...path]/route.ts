import { handleApi } from '@/server/app/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handleApi;
export const POST = handleApi;
export const PUT = handleApi;
export const PATCH = handleApi;
export const DELETE = handleApi;
