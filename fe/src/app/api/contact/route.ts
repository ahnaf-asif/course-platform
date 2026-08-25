import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPlaceholderWebhook(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('mock') ||
    lower.includes('fake') ||
    lower === ''
  );
}

export async function POST(req: NextRequest) {
  try {
    const body: ContactPayload = await req.json();
    const { name, email, phone, subject, message } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email.trim())) {
      return NextResponse.json(
        { message: 'সঠিক ইমেইল ঠিকানা দিন' },
        { status: 400 }
      );
    }

    if (!subject || subject.trim().length < 3) {
      return NextResponse.json(
        { message: 'বিষয় কমপক্ষে ৩ অক্ষরের হতে হবে' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { message: 'বার্তা কমপক্ষে ১০ অক্ষরের হতে হবে' },
        { status: 400 }
      );
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // Simulation fallback if webhook URL is not configured or is a placeholder
    if (isPlaceholderWebhook(discordWebhookUrl)) {
      console.log('📢 [Discord Webhook Simulation] Contact submission received:', {
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          message: 'বার্তা সফলভাবে পাঠানো হয়েছে (সিমুলেশন মোড)',
        },
        { status: 200 }
      );
    }

    // Discord ANSI formatting color codes
    const ansiYellow = '\u001b[1;33m';
    const ansiReset = '\u001b[0m';

    let contactDetails =
      `${ansiYellow}নাম (Name):${ansiReset}    ${name.trim()}\n` +
      `${ansiYellow}ইমেইল (Email):${ansiReset} ${email.trim()}\n`;

    if (phone && phone.trim().length > 0) {
      contactDetails += `${ansiYellow}ফোন (Phone):${ansiReset}   ${phone.trim()}\n`;
    }

    contactDetails += `${ansiYellow}বিষয় (Subject):${ansiReset} ${subject.trim()}\n`;

    // Prepare Discord rich embed payload
    const discordPayload = {
      username: 'EduVerse Contact Desk',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      embeds: [
        {
          title: 'নতুন যোগাযোগ বার্তা (New Contact Message)',
          description:
            'EduVerse প্ল্যাটফর্মের ওয়েবসাইট থেকে একজন শিক্ষার্থী বার্তা পাঠিয়েছেন।\n\n\u200B' +
            '```ansi\n' +
            contactDetails +
            '```\n\u200B',
          color: 3901686, // EduVerse Blue (#3B82F6)
          fields: [
            {
              name: 'বার্তা (Message)',
              value: `>>> ${message.trim()}`,
              inline: false,
            },
          ],
          footer: {
            text: 'EduVerse Learning Platform • Contact Submissions',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const discordResponse = await fetch(discordWebhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('❌ [Discord Webhook Error]:', discordResponse.status, errorText);
      return NextResponse.json(
        { message: 'ডিসকর্ড নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'আপনার বার্তা সফলভাবে পৌঁছেছে',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [Contact API Error]:', error);
    return NextResponse.json(
      { message: 'সার্ভার ত্রুটি ঘটেছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
