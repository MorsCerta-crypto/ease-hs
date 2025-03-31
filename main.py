from fasthtml.common import *
from monsterui.all import *
from dotenv import load_dotenv
from authentication import ar, beforeware
from floorplan_routes import ar as floorplan_ar

load_dotenv()

# Initialize FastHTML app with blue theme
app, rt = fast_app(
    hdrs=(
        Theme.blue.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
        # Script(src="/static/js/floorplanner.js"),
        Script(src="/static/js/editor.js", type="module"),
        Script(src="/static/js/engine.js", type="module"),
        Script(src="/static/js/func.js", type="module"),
        Script(src="/static/js/mousewheel.js", type="module"),
        Script(src="/static/js/qSVG.js", type="module"),
    ),
    before=Beforeware(beforeware,skip=["/auth/.*","/static", "/"])
)

# Add auth router to app
ar.to_app(app)

# Add floorplan router to app
floorplan_ar.to_app(app)
# Home route - redirects to login if not authenticated or floorplans if authenticated
@app.get("/")
def index(req):
    # Check if user is authenticated
    user_id = req.session.get('auth')
    
    return Titled(
        "Sicherheits-Grundrissplaner",
        Div(
            # Header container
            Div(
                Div(
                    H3("Ease-HS", cls="header-title"),
                    cls="header-left"
                ),
                Div(
                    A("Home", href="/", cls="uk-button uk-button-default"),
                    Button("Kontakt", cls="uk-button uk-button-default", uk_toggle="target: #contact-modal"),
                    A("Login", href="/auth/login", cls="uk-button uk-button-default") if not user_id else None,
                    A("Registrieren", href="/auth/register", cls="uk-button uk-button-primary ml-2") if not user_id else None,
                    Button("Abmelden", hx_get="/auth/logout") if user_id else None,
                    cls="header-right"
                ),
                id="header-container",
                cls="header-container"
            ),
            
            # Main content area with floor plan container
            Div(
                Div(
                    Card(
                        H3("Willkommen beim Sicherheits-Grundrissplaner"),
                        P("Erstellen und verwalten Sie Grundrisse mit sicherheitsrelevanten Elementen"),
                        P("Verwenden Sie dieses Tool, um Grundrisse Ihrer Einrichtung mit folgenden Elementen zu zeichnen:"),
                        Ul(
                            Li("Wände und Raumaufteilungen"),
                            Li("Türen (rote Notausgänge und standardmäßig graue)"),
                            Li("Fenster für Belüftung und Notfallzugang"),
                            Li("Maschinen (anklickbar mit Sicherheitsinformationen)"),
                            Li("Sicherheitsschränke für gefährliche Materialien")
                        ),
                        Div(
                            A("Login", href="/auth/login", cls="uk-button uk-button-primary"),
                            A("Registrieren", href="/auth/register", cls="uk-button uk-button-default ml-2")
                        )
                    ) if not user_id else Div(
                        id="floorplan-content",
                        hx_get="/load_floorplan", 
                        hx_trigger="load",
                        hx_swap="innerHTML"
                    ),
                    id="floorplan-container",
                    cls="floorplan-container"
                ),
                id="main-content",
                cls=("mt-5", "uk-container-xl")
            ),
            
            # Contact modal
            Div(
                Div(
                    Button("×", cls="uk-modal-close-default", uk_close=""),
                    Div(
                        H2("Kontakt", cls="uk-modal-title"),
                        P("Für Fragen und Support kontaktieren Sie uns:"),
                        P("Email: kontakt@ease-hs.de"),
                        P("Telefon: +49 123 456789"),
                        cls="uk-modal-body"
                    ),
                    Div(
                        Button("Schließen", cls="uk-button uk-button-default uk-modal-close"),
                        cls="uk-modal-footer"
                    ),
                    cls="uk-modal-dialog"
                ),
                id="contact-modal",
                cls="uk-modal",
                uk_modal=""
            ),
            
            cls="app-container"
        )
    )


# Start the server
serve()
