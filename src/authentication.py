from fasthtml.common import *
from monsterui.all import *
from hmac import compare_digest
import hashlib
from datetime import datetime
from db import UserDB, users, documents, floorplans

# API Router for authentication routes
ar = APIRouter(prefix='/auth')

# Helper function to hash passwords
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Authentication middleware
def beforeware(req, session):
    # Set auth in scope based on session
    auth = session.get('auth', None)
    if not auth:
        # Create redirect response
        response = RedirectResponse('/auth/login', status_code=303)
        return response
    # Apply user filter to database queries
    documents.xtra(user_id=auth)
    floorplans.xtra(user_id=auth)

# Login form with better styling
def login_form():
    return Form(
        H3("Willkommen zurück"),
        P("Geben Sie Ihre Anmeldedaten ein, um auf Ihr Konto zuzugreifen", cls="uk-text-muted"),
        Grid(
            LabelInput("Benutzername", name="username", required=True, 
                       cls="uk-width-1-1", placeholder="Geben Sie Ihren Benutzernamen ein"),
            LabelInput("Passwort", name="password", type="password", required=True, 
                       cls="uk-width-1-1", placeholder="Geben Sie Ihr Passwort ein"),
            cols=1, gap=4
        ),
        DivCentered(Button("Anmelden", type="submit", cls="uk-button-primary uk-width-1-1")),
        DivHStacked(
            P("Noch kein Konto?", cls="uk-text-muted uk-text-small"),
            A("Jetzt registrieren", href="/auth/register", cls="uk-text-primary")
        ),
        Div(id="login-status", cls="uk-margin-top"),
        hx_post="/auth/login_submit",
        hx_target="#login-status",
        cls="uk-form-stacked uk-grid-small"
    )

# Register form with better styling
def register_form():
    return Form(
        H3("Neues Konto erstellen"),
        P("Geben Sie Ihre Informationen ein, um ein neues Konto zu erstellen", cls="uk-text-muted"),
        Grid(
            LabelInput("Firmenname", name="company_name", required=True, 
                       cls="uk-width-1-1", placeholder="Name Ihres Unternehmens"),
            LabelInput("Firmenemail", name="email", type="email", required=True, 
                       cls="uk-width-1-1", placeholder="firmen@email.de"),
            LabelInput("Benutzername", name="username", required=True, 
                       cls="uk-width-1-1", placeholder="Wählen Sie einen Benutzernamen"),
            LabelInput("Passwort", name="password", type="password", required=True, 
                       cls="uk-width-1-1", placeholder="Wählen Sie ein sicheres Passwort"),
            LabelInput("Passwort bestätigen", name="password_confirm", type="password", required=True, 
                       cls="uk-width-1-1", placeholder="Passwort wiederholen"),
            cols=1, gap=4
        ),
        DivCentered(Button("Registrieren", type="submit", cls="uk-button-primary uk-width-1-1")),
        DivHStacked(
            P("Bereits registriert?", cls="uk-text-muted uk-text-small"),
            A("Zum Login", href="/auth/login", cls="uk-text-primary")
        ),
        Div(id="register-status", cls="uk-margin-top"),
        hx_post="/auth/register_submit",
        hx_target="#register-status",
        cls="uk-form-stacked uk-grid-small"
    )

# Login page
@ar("/login")
def login_page():
    return Titled(
        "Login - Sicherheits-Grundrissplaner",
        Container(
            Div(
                Card(
                    CardHeader(H2("Login", cls="uk-card-title uk-text-center")),
                    CardBody(login_form()),
                ),
                cls="uk-width-1-2@m uk-margin-auto"
            ),
            cls="uk-container uk-container-small uk-margin-large-top uk-margin-large-bottom"
        )
    )

# Login submission handler
@ar("/login_submit", methods=["POST"])
def login_submit(req, username: str, password: str):
    try:
        user = users.fetchone(where='username = ?', where_args=(username,))
        if not user:
            return Div("Benutzername existiert nicht", cls="error-message")
        
        # Compare password hash
        password_hash = hash_password(password)
        if not compare_digest(user.password_hash, password_hash):
            return Div("Falsches Passwort", cls="error-message")
        
        # Set session auth
        req.session['auth'] = user.id
        req.session['username'] = user.username
        if user.company_name:
            req.session['company_name'] = user.company_name
        
        # Success - redirect to floorplan dashboard
        return Redirect('/floorplans')
    except Exception as e:
        return Div(f"Fehler beim Login: {str(e)}", cls="error-message")

# Register page
@ar("/register")
def register_page():
    return Titled(
        "Registrieren - Sicherheits-Grundrissplaner",
        Container(
            Div(
                Card(
                    CardHeader(H2("Neues Konto erstellen", cls="uk-card-title uk-text-center")),
                    CardBody(register_form()),
                ),
                cls="uk-width-1-2@m uk-margin-auto"
            ),
            cls="uk-container uk-container-small uk-margin-large-top uk-margin-large-bottom"
        )
    )

# Register submission handler
@ar("/register_submit", methods=["POST"])
def register_submit(req, company_name: str, email: str, username: str, password: str, password_confirm: str):
    try:
        # Check if passwords match
        if password != password_confirm:
            return Div("Passwörter stimmen nicht überein", cls="error-message")
        # Check if username exists
        print('fetching user')
        existing_user = users(where='username = ?', where_args=(username,))
        if existing_user:
            return Div("Benutzername bereits vergeben", cls="error-message")
        # Check if email exists
        print('fetching email')
        existing_email = users(where='email = ?', where_args=(email,))
        if existing_email:
            return Div("E-Mail-Adresse bereits registriert", cls="error-message")
        # Password strength validation
        if len(password) < 8:
            return Div("Passwort muss mindestens 8 Zeichen lang sein", cls="error-message")
        # Hash password
        password_hash = hash_password(password)
        # Create user
        now = datetime.now().isoformat()
        print('inserting user')
        user = users.insert(UserDB(
            id=None,
            username=username,
            email=email,
            company_name=company_name,
            password_hash=password_hash,
            created_at=now
        ))
        print(user, type(user))
        if not user:
            return Div("Fehler bei der Registrierung", cls="error-message")
        return Redirect('/auth/login')
    except Exception as e:
        print(type(e))
        return Div(f"Fehler bei der Registrierung: {str(e)}", cls="error-message")

# Logout handler
@ar("/logout")
def logout(req, session):
    # Clear session
    if 'auth' in session:
        del session['auth']
    if 'username' in session:
        del session['username']
    if 'company_name' in session:
        del session['company_name']
    
    # Redirect to login page
    return RedirectResponse('/auth/login', status_code=303)

# User profile page
@ar("/profile")
def user_profile(req):
    # Get user ID from session
    user_id = req.session.get('auth')
    if not user_id:
        return Redirect('/auth/login')
    
    # Get user details
    user = users.fetchone(where='id = ?', where_args=(user_id,))
    if not user:
        return Redirect('/auth/login')
    
    # Display user profile
    return Titled(
        "Mein Profil - Sicherheits-Grundrissplaner",
        Container(
            Div(
                Card(
                    CardHeader(H2(f"Profil: {user.username}", cls="uk-card-title")),
                    CardBody(
                        Div(
                            Div(
                                H4("Persönliche Informationen"),
                                P(f"Benutzername: {user.username}"),
                                P(f"E-Mail: {user.email}"),
                                P(f"Firmenname: {user.company_name or 'Nicht angegeben'}"),
                                P(f"Registriert am: {format_date(user.created_at)}"),
                                cls="uk-margin-bottom"
                            ),
                            Div(
                                H4("Aktionen"),
                                Button("Passwort ändern", hx_get="/auth/change_password", hx_target="#profile-action"),
                                Div(id="profile-action", cls="uk-margin-top"),
                                cls="uk-margin-bottom"
                            ),
                            cls="uk-margin"
                        )
                    ),
                    CardFooter(
                        Div(
                            Button("Zurück zur Übersicht", hx_get="/floorplans", hx_target="body"),
                            cls="uk-text-center"
                        )
                    )
                ),
                cls="uk-width-2-3@m uk-margin-auto"
            ),
            cls="uk-container uk-margin-large-top uk-margin-large-bottom"
        )
    )

# Helper function to format date
def format_date(date_str):
    if not date_str:
        return "Unbekannt"
    try:
        dt = datetime.fromisoformat(date_str)
        return dt.strftime("%d.%m.%Y %H:%M")
    except:
        return date_str

# Get current user from request
def get_current_user(req):
    user_id = req.session.get('auth')
    if not user_id:
        return None
    return users.fetchone(where='id = ?', where_args=(user_id,)) 



example = """from fasthtml.common import *
from fasthtml.oauth import GitHubAppClient, redir_url

# # Set up a database
db = database('data/user_counts.db')
user_counts = db.t.user_counts
if user_counts not in db.t:
    user_counts.create(dict(name=str, count=int), pk='name')
Count = user_counts.dataclass()

# Auth client setup for GitHub
client = GitHubAppClient(os.getenv("AUTH_CLIENT_ID"), 
                         os.getenv("AUTH_CLIENT_SECRET"))
redir_path = "/auth_redirect"


# Beforeware that puts the user_id in the request scope or redirects to the login page if not logged in.
def before(req, session):
    # The `auth` key in the scope is automatically provided to any handler which requests it, and can not
    # be injected by the user using query params, cookies, etc, so it should be secure to use.
    auth = req.scope['auth'] = session.get('user_id', None)
    # If the session key is not there, it redirects to the login page.
    if not auth: return RedirectResponse('/login', status_code=303)
    # If the user is not in the database, redirect to the login page.
    if auth not in user_counts: return RedirectResponse('/login', status_code=303)
    # Ensure user can only see their own counts:
    user_counts.xtra(name=auth)
bware = Beforeware(before, skip=['/login', '/auth_redirect'])

app = FastHTML(before=bware)

# Homepage (only visible if logged in)
@app.get('/')
def home(auth):
    return Div(
        P("Count demo"),
        P(f"Count: ", Span(user_counts[auth].count, id='count')),
        Button('Increment', hx_get='/increment', hx_target='#count'),
        P(A('Logout', href='/logout'))  # Link to log out,
    )

@app.get('/increment')
def increment(auth):
    c = user_counts[auth]
    c.count += 1
    return user_counts.upsert(c).count

# The login page has a link to the GitHub login page.
@app.get('/login')
def login(request):
    redir = redir_url(request, redir_path)
    return Div(P("You are not logged in."), 
               A('Log in with GitHub', href=client.login_link(redir)))

# To log out, we just remove the user_id from the session.
@app.get('/logout')
def logout(session):
    session.pop('user_id', None)
    return RedirectResponse('/login', status_code=303)

# The redirect page is where the user is sent after logging in.
@app.get('/auth_redirect')
def auth_redirect(code: str, request, session, state: str = None):
    redir = redir_url(request, redir_path)
    if not code: return "No code provided!"
    print(f"code: {code}")
    print(f"state: {state}") # Not used in this example.
    try:
        # The code can be used once, to get the user info:
        info = client.retr_info(code, redir)
        print(f"info: {info}")
        # Use client.retr_id(code) directly if you just want the id, otherwise get the id with:
        user_id = info[client.id_key]
        print(f"User id: {user_id}")
        # Access token (populated after retr_info or retr_id) - unique to this user,
        # and sometimes used to revoke the login. Not used in this case.
        token = client.token["access_token"]
        print(f"access_token: {token}")

        # We put the user_id in the session, so we can use it later.
        session['user_id'] = user_id

        # We also add the user in the database, if they are not already there.
        if user_id not in user_counts:
            user_counts.insert(name=user_id, count=0)

        # Redirect to the homepage
        return RedirectResponse('/', status_code=303)

    except Exception as e:
        print(f"Error: {e}")
        return f"Could not log in."

serve(port=8000)"""