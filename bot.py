import os
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from google import genai
from google.genai import types

# API kalitlar muhit o'zgaruvchilaridan olinadi
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
ALLOWED_USER_ID = os.getenv("TELEGRAM_CHAT_ID")

client = genai.Client(api_key=GEMINI_KEY)

# 1-Agent: G'oyalar generatori
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if ALLOWED_USER_ID and user_id != str(ALLOWED_USER_ID):
        await update.message.reply_text("Kechirasiz, bu shaxsiy bot.")
        return
    await update.message.reply_text(
        "Salom! Men sizning shaxsiy AI Reels ishlab chiqaruvchi agentingizman.\n\n"
        "Menga videongiz qaysi mavzu yoki mahsulot haqida bo'lishini yozing (masalan: 'Manipulyatsiya kitobi' yoki 'Soch parvarishi')."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if ALLOWED_USER_ID and user_id != str(ALLOWED_USER_ID):
        return

    topic = update.message.text
    status_msg = await update.message.reply_text("Gemini tahlil qilmoqda va ssenariy tayyorlamoqda...")

    system_instruction = (
        "Sen viral Reels va TikTok roliklari bo'yicha kuchli ssenarist va kontent-strategisan. "
        "Foydalanuvchi bergan mavzuga asosan professional o'zbek tilida quyidagi 3 qismdan iborat to'liq loyihani tayyorlab ber:\n\n"
        "1. KONTENT G'OYASI VA VIRAL HOOK (Dastlabki 3 soniyada ushlab qoluvchi gap)\n"
        "2. 30-40 SONIYALIK TO'LIQ SSENARIY (Diktorni o'qishi uchun so'zma-so'z matn, pauzalar va CTA — harakatga chaqiruv)\n"
        "3. KADRLAR REJASI (Visual Prompts / Har bir soniyada ekranda qanday vizual rasm yoki matn chiqishi kerakligi)\n"
        "4. INSTAGRAM POST MATNI (Caption) VA HESHTEGLAR."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"Mavzu: {topic}. Yuqoridagi ko'rsatma bo'yicha tayyor Reels shablonini ber.",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        
        # Telegram bitta xabarda 4096 belgidan oshiq qabul qilmaydi, kerak bo'lsa bo'lib yuboramiz
        text = response.text
        if len(text) > 4000:
            for i in range(0, len(text), 4000):
                await update.message.reply_text(text[i:i+4000])
        else:
            await update.message.reply_text(text)
            
        await status_msg.delete()
    except Exception as e:
        await status_msg.edit_text(f"Xatolik yuz berdi: {str(e)}")

if __name__ == '__main__':
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling()
