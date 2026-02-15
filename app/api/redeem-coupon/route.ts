import { NextResponse } from 'next/server';
import { renderPosterSvg } from '../../../lib/poster';
import type { CheckoutDraft } from '../../../lib/checkout';
import { renderCityMapSvg, type CityMapRequest } from '../../../lib/citymap';
import type { PosterRequest } from '../../../lib/types';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import JSZip from 'jszip';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';

type OrderRow = {
  id: string;
  order_code: string;
  status: 'pending' | 'completed';
  used_at: string | null;
  pdf_url: string | null;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isSimulationCoupon(orderCode: string): boolean {
  const simulationEnabled = (process.env.ETSY_SIMULATION_MODE ?? 'true').trim().toLowerCase() === 'true';
  if (!simulationEnabled) return false;
  const allowAny = (process.env.ETSY_SIMULATION_ALLOW_ANY ?? 'true').trim().toLowerCase() === 'true';
  if (allowAny) return true;
  const prefix = (process.env.ETSY_SIMULATION_PREFIX ?? 'SIM-').trim();
  return prefix.length > 0 && orderCode.toUpperCase().startsWith(prefix.toUpperCase());
}

function withAbsoluteMoonUrl(svg: string, req: Request): string {
  const configuredBase = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const requestBase = new URL(req.url).origin;
  const base = configuredBase || requestBase;
  const absoluteMoon = `${base}/moon.png`;
  return svg
    .replaceAll('href="/moon.png"', `href="${absoluteMoon}"`)
    .replaceAll("href='/moon.png'", `href='${absoluteMoon}'`)
    .replaceAll('xlink:href="/moon.png"', `xlink:href="${absoluteMoon}"`)
    .replaceAll("xlink:href='/moon.png'", `xlink:href='${absoluteMoon}'`);
}

function getSvgSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox="[^"]*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i);
  if (viewBoxMatch) {
    return { width: Math.max(1, Number(viewBoxMatch[1])), height: Math.max(1, Number(viewBoxMatch[2])) };
  }
  const wMatch = svg.match(/width="(\d+(?:\.\d+)?)"/i);
  const hMatch = svg.match(/height="(\d+(?:\.\d+)?)"/i);
  return {
    width: Math.max(1, Number(wMatch?.[1] || 1200)),
    height: Math.max(1, Number(hMatch?.[1] || 1800))
  };
}

async function makePdfFromPng(pngBuffer: Buffer, widthPx: number, heightPx: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const ptPerPx = 72 / 300; // treat raster as 300 DPI for print-friendly scale
  const pageWidth = Math.max(72, widthPx * ptPerPx);
  const pageHeight = Math.max(72, heightPx * ptPerPx);
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      couponCode?: string;
      email?: string;
      draft?: CheckoutDraft;
    };

    const couponCode = (body.couponCode || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const draft = body.draft;
    const ordersTable = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const storageBucket = (process.env.SUPABASE_STORAGE_BUCKET ?? 'generated-maps').trim();

    if (!couponCode) {
      return NextResponse.json({ success: false, message: 'Coupon code is required.' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!draft?.renderRequest || !draft?.previewSvg || !draft?.mapData) {
      return NextResponse.json({ success: false, message: 'Missing map data. Please return to designer.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    let order: OrderRow | null = null;
    const lookup = await supabase
      .from(ordersTable)
      .select('id,order_code,status,used_at,pdf_url')
      .eq('order_code', couponCode)
      .maybeSingle();

    if (lookup.error) {
      throw new Error(`Failed to validate coupon: ${lookup.error.message}`);
    }
    order = lookup.data as OrderRow | null;

    // Etsy inactive for now: allow simulation codes and seed pending order row on first use.
    if (!order && isSimulationCoupon(couponCode)) {
      const seeded = await supabase
        .from(ordersTable)
        .insert({
          order_code: couponCode,
          status: 'pending'
        })
        .select('id,order_code,status,used_at,pdf_url')
        .single();

      if (seeded.error) {
        throw new Error(`Failed to create simulated order: ${seeded.error.message}`);
      }
      order = seeded.data as OrderRow;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Invalid coupon code. Please check your Etsy order confirmation.' },
        { status: 400 }
      );
    }

    if (order.status === 'completed') {
      const usedOn = order.used_at ? new Date(order.used_at).toLocaleString('en-US') : 'a previous date';
      return NextResponse.json(
        {
          success: false,
          message: `This coupon was already used on ${usedOn}.`,
          orderCode: order.order_code,
          downloadUrl: order.pdf_url
        },
        { status: 400 }
      );
    }

    const isCityDraft = draft.productType === 'city';
    let svg = '';
    try {
      if (isCityDraft) {
        svg = await renderCityMapSvg(draft.renderRequest as CityMapRequest);
      } else {
        svg = renderPosterSvg(draft.renderRequest as PosterRequest);
      }
    } catch {
      svg = draft.previewSvg;
    }

    if (!svg.trim().startsWith('<')) {
      return NextResponse.json(
        { success: false, message: 'Could not generate map output. Please try again.' },
        { status: 500 }
      );
    }
    if (!isCityDraft) {
      svg = withAbsoluteMoonUrl(svg, req);
    }

    const safeCode = couponCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ts = Date.now();
    const { width: svgW, height: svgH } = getSvgSize(svg);
    const png = await sharp(Buffer.from(svg, 'utf-8')).png({ compressionLevel: 9 }).toBuffer();
    const pdf = await makePdfFromPng(png, svgW, svgH);

    const zip = new JSZip();
    const filePrefix = isCityDraft ? 'citymap' : 'ourskymap';
    zip.file(`${filePrefix}-${safeCode}.svg`, svg);
    zip.file(`${filePrefix}-${safeCode}.png`, png);
    zip.file(`${filePrefix}-${safeCode}.pdf`, pdf);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

    const fileName = `star-maps/${safeCode}-${ts}.zip`;
    const upload = await supabase.storage.from(storageBucket).upload(fileName, zipBuffer, {
      contentType: 'application/zip',
      upsert: true
    });
    if (upload.error) {
      throw new Error(`Storage upload failed: ${upload.error.message}`);
    }

    const { data: publicFile } = supabase.storage.from(storageBucket).getPublicUrl(fileName);
    const fileUrl = publicFile.publicUrl;

    const update = await supabase
      .from(ordersTable)
      .update({
        status: 'completed',
        used_at: new Date().toISOString(),
        customer_email: email,
        location: draft.mapData.city,
        date: draft.mapData.date ?? '',
        time: draft.mapData.time ?? '',
        title: draft.mapData.title,
        names: draft.mapData.names ?? '',
        font: draft.mapData.font,
        pdf_url: fileUrl
      })
      .eq('order_code', couponCode);

    if (update.error) {
      throw new Error(`Failed to update order: ${update.error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Your map is ready.',
      orderCode: couponCode,
      downloadUrl: fileUrl
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message ?? 'Failed to process coupon.'
      },
      { status: 500 }
    );
  }
}
