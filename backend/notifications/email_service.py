from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings

def send_welcome_email(user_email, username):
    message = Mail(
        from_email='noreply@sasl.app',
        to_emails=user_email,
        subject='Welcome to Sasl! 🚀',
        html_content=f'''
        <h1>Welcome to Sasl, {username}!</h1>
        <p>You've joined the world's first offline-first social network.</p>
        <p>Start earning today:</p>
        <ul>
            <li>💰 Post content & earn from subscriptions</li>
            <li>🛍️ Sell products on Marketplace</li>
            <li>🎥 Stream live & receive donations</li>
            <li>📚 Teach & get paid for tutoring</li>
        </ul>
        <p><a href="https://saslapp.netlify.app">Get Started →</a></p>
        '''
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"Email failed: {e}")