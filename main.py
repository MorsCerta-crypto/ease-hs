from fasthtml.common import *
from monsterui.all import *
import json
from datetime import datetime
from dotenv import load_dotenv
from db import users,floorplans,documents,FloorPlanDB
from s3 import upload_floorplan_to_s3,generate_s3_document_url,upload_document_to_s3
from authentication import ar, beforeware

load_dotenv()

# Initialize FastHTML app with blue theme
app, rt = fast_app(
    hdrs=(
        Theme.blue.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
        Script(src="/static/js/floorplanner.js"),
    ),
    before=Beforeware(beforeware,skip=["/auth/.*","/static", "/"])
)

# Add auth router to app
ar.to_app(app)

# User Management Functions
def create_user(username, email, password_hash, company_name=None):
    """Create a new user in the database"""
    try:
        now = datetime.now().isoformat()
        user_id = users.insert({
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "company_name": company_name,
            "created_at": now
        })
        return user_id
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return None

def get_user_by_username(username):
    """Get user by username"""
    try:
        return users.fetchone(where='username = ?',where_args=(username,))
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        return None

# Database Floor Plan Functions
def create_floorplan_in_db(user_id, name, width, height, data=None)->FloorPlanDB|None:
    """Create a new floorplan in the database"""
    try:
        now = datetime.now().isoformat()
        floorplan_id = floorplans.insert({
            "user_id": user_id,
            "name": name,
            "width": width,
            "height": height,
            "data": json.dumps(data or {"elements": []}),
            "created_at": now,
            "updated_at": now
        })
        return floorplan_id
    except Exception as e:
        print(f"Error creating floorplan: {str(e)}")
        return None

def update_floorplan_in_db(floorplan_id, data):
    """Update a floorplan in the database"""
    try:
        now = datetime.now().isoformat()
        floorplans.update({
            "id": floorplan_id,
            "data": json.dumps(data),
            "updated_at": now
        })
        return True
    except Exception as e:
        print(f"Error updating floorplan: {str(e)}")
        return False

def get_floorplan_from_db(floorplan_id, user_id=None):
    """Get a floorplan from the database"""
    try:
        if user_id:
            floorplan = floorplans.fetchone(where='id = ? AND user_id = ?', where_args=(floorplan_id, user_id))
        else:
            floorplan = floorplans.fetchone(where='id = ?', where_args=(floorplan_id,))
        
        if floorplan:
            floorplan.data = json.loads(floorplan.data)
        return floorplan
    except Exception as e:
        print(f"Error getting floorplan: {str(e)}")
        return None

def get_user_floorplans(user_id):
    """Get all floorplans for a user"""
    try:
        return floorplans(where='user_id = ?',where_args=(user_id,))
    except Exception as e:
        print(f"Error getting user floorplans: {str(e)}")
        return []

def add_document_to_db(floorplan_id, element_id, filename, s3_key):
    """Add document metadata to database"""
    try:
        now = datetime.now().isoformat()
        doc_id = documents.insert({
            "floorplan_id": floorplan_id,
            "element_id": element_id,
            "filename": filename,
            "s3_key": s3_key,
            "upload_date": now
        })
        return doc_id
    except Exception as e:
        print(f"Error adding document to database: {str(e)}")
        return None

def get_element_documents(floorplan_id, element_id, user_id=None):
    """Get all documents for an element"""
    try:
        if user_id:
            # First verify that this floorplan belongs to the user
            floorplan = get_floorplan_from_db(floorplan_id, user_id)
            if not floorplan:
                return []
                
        docs = documents(where='floorplan_id = ? AND element_id = ?', where_args=(floorplan_id, element_id))
        for doc in docs:
            doc['url'] = generate_s3_document_url(doc['s3_key'])
        return docs
    except Exception as e:
        print(f"Error getting element documents: {str(e)}")
        return []

# Home route - redirects to login if not authenticated or floorplans if authenticated
@rt
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
                    ) if not user_id else Div(hx_get=load_floorplan, hx_target="#floorplan-container", hx_trigger="load"),
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

# Floorplans dashboard
@rt("/floorplans")
def floorplans_dashboard(req):
    # Get current user
    user_id = req.session.get('auth')
    username = req.session.get('username', 'Benutzer')
    company_name = req.session.get('company_name', '')
    
    if not user_id:
        return RedirectResponse('/auth/login', status_code=303)
    
    return Titled(
        "Meine Grundrisse - Sicherheits-Grundrissplaner",
        Div(
            # Header container
            Div(
                Div(
                    H3("Ease-HS", cls="header-title"),
                    cls="header-left"
                ),
                Div(
                    A("Home", href="/", cls="uk-button uk-button-default"),
                    Span(f"{company_name} - {username}", cls="mr-3") if company_name else Span(f"Angemeldet als {username}", cls="mr-3"),
                    Button("Neuer Grundriss", hx_get=create_floorplan, hx_target="#floorplan-container"),
                    Button("Kontakt", cls="uk-button uk-button-default", uk_toggle="target: #contact-modal"),
                    A("Mein Profil", href="/auth/profile", cls="uk-button uk-button-default mr-3"),
                    Button("Abmelden", hx_get="/auth/logout"),
                    cls="header-right"
                ),
                id="header-container",
                cls="header-container"
            ),
            
            # Main content with floorplan container
            Div(
                Div(
                    hx_get=load_floorplan,
                    hx_target="#floorplan-container",
                    hx_trigger="load",
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

# Create a new floor plan - updated to target floorplan-container
@rt
def create_floorplan(sess):
    # Get current user ID
    user_id = sess.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    return Card(
        CardHeader(H3("Neuer Grundriss")),
        CardBody(
            Form(
                LabelInput("Grundrissname", name="name", required=True),
                LabelInput("Breite (Meter)", name="width", type="number", value="20", min="5", max="100"),
                LabelInput("Höhe (Meter)", name="height", type="number", value="15", min="5", max="100"),
                Button("Erstellen", type="submit", hx_post=initialize_floorplan, hx_target="#floorplan-container")
            )
        )
    )

# Initialize a floor plan - updated to target floorplan-container
@rt
def initialize_floorplan(req, name: str, width: float, height: float):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    # Create floorplan in database
    floorplan = create_floorplan_in_db(
        user_id,
        name,
        float(width),
        float(height)
    )
    
    if not floorplan:
        return Card(
            H3("Fehler"),
            P("Der Grundriss konnte nicht erstellt werden."),
            Button("Zurück", hx_get=load_floorplan, hx_target="#floorplan-container")
        )
    
    return floorplan_editor(req, floorplan_id=floorplan.id)

# Load existing floor plans - updated to work with floorplan-container
@rt
def load_floorplan(req):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    # Get list of floor plans for current user from database
    user_floorplans = get_user_floorplans(user_id)
    
    if not user_floorplans:
        return Card(
            H3("Keine Grundrisse gefunden"),
            P("Sie haben noch keine Grundrisse erstellt. Erstellen Sie einen neuen, um zu beginnen."),
            Button("Neu erstellen", hx_get=create_floorplan, hx_target="#floorplan-container")
        )
    
    return Card(
        CardHeader(H3("Meine Grundrisse")),
        CardBody(
            Div(
                Table(
                    Thead(Tr(Th("Name"), Th("Größe"), Th("Erstellt am"), Th("Zuletzt bearbeitet"), Th("Aktionen"))),
                    Tbody(*[
                        Tr(
                            Td(plan.name),
                            Td(f"{plan.width}m × {plan.height}m"),
                            Td(format_date(plan.created_at)),
                            Td(format_date(plan.updated_at)),
                            Td(Button("Öffnen", hx_get=floorplan_editor.to(floorplan_id=str(plan.id)), hx_target="#floorplan-container"))
                        ) 
                        for plan in user_floorplans
                    ])
                ),
                cls="space-y-4"
            )
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

# Floor plan editor
@rt
def floorplan_editor(req, floorplan_id: str):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    # Load floor plan data from database
    if floorplan_id:
        try:
            floorplan = get_floorplan_from_db(int(floorplan_id), user_id)
            if not floorplan:
                return Card(
                    H3("Fehler"),
                    P("Der Grundriss konnte nicht geladen oder gehört nicht zu Ihrem Konto."),
                    Button("Zurück", hx_get=load_floorplan, hx_target="#floorplan-container")
                )
        except Exception as e:
            print(e)
            return Card(
                H3("Fehler"),
                P("Der Grundriss konnte nicht geladen werden."),
                Button("Zurück", hx_get=load_floorplan, hx_target="#floorplan-container")
            )
    
    return Div(
        # Mode toggle at the top
        Div(
            Div(
                H4("Modus:"),
                Div(
                    Label(
                        Input(
                            type="checkbox",
                            id="mode-toggle",
                            cls="mode-toggle-checkbox"
                        ),
                        Span("Bearbeiten", id="edit-label", cls="mode-label active"),
                        Span("Ansicht", id="view-label", cls="mode-label"),
                        cls="mode-toggle-switch"
                    ),
                    cls="mode-toggle-container"
                ),
                cls="mode-toggle-wrapper"
            ),
            cls="mode-toggle-panel"
        ),
        
        # Left sidebar with tools (Edit Mode)
        Div(
            Card(
                H4("Werkzeuge"),
                Button("Auswählen", cls="tool-btn active", data_tool="select"),
                Button("Wand", cls="tool-btn", data_tool="wall"),
                Button("Tür (Standard)", cls="tool-btn", data_tool="door-standard"),
                Button("Tür (Notausgang)", cls="tool-btn", data_tool="door-emergency"),
                Button("Fenster", cls="tool-btn", data_tool="window"),
                Button("Fluchtwege", cls="tool-btn", data_tool="fluchtwege"),
                Button("Maschine", cls="tool-btn", data_tool="machine"),
                Button("Sicherheitsschrank", cls="tool-btn", data_tool="closet"),
                Button("Löschen", cls="tool-btn", data_tool="delete", disabled="disabled"),
                cls="tool-sidebar"
            ),
            cls="tool-container",
            id="edit-mode-sidebar"
        ),
        
        # Left sidebar with safety information (View Mode)
        Div(
            Card(
                H4("Sicherheitsinformationen"),
                P("Klicken Sie auf eine Maschine oder einen Sicherheitsschrank, um Details anzuzeigen", id="view-mode-instruction"),
                
                # Element details form
                Form(
                    Div(
                        H5("Elementdetails"),
                        LabelInput("Name", id="element-name", name="element_name"),
                        LabelInput("Typ", id="element-type-display", name="element_type", readonly=True),
                        cls="element-details-section"
                    ),
                    
                    # Safety information section
                    Div(
                        H5("Sicherheitsinformationen"),
                        LabelInput("Standort-ID", id="safety-location-id", name="safety_location_id"),
                        LabelSelect(
                            Option("Stufe 1 - Minimal", value="1"),
                            Option("Stufe 2 - Gering", value="2"),
                            Option("Stufe 3 - Mittel", value="3"),
                            Option("Stufe 4 - Hoch", value="4"),
                            Option("Stufe 5 - Extrem", value="5"),
                            label="Gefahrenklasse",
                            _id="safety-hazard-class",
                            name="safety_hazard_class"
                        ),
                        LabelTextArea(
                            label="Potenzielle Gefahren",
                            _id="safety-dangers",
                            name="safety_dangers",
                            rows=3
                        ),
                        LabelTextArea(
                            label="Notfallmaßnahmen",
                            _id="safety-emergency",
                            name="safety_emergency",
                            rows=3
                        ),
                        LabelTextArea(
                            label="Erforderliche Schutzausrüstung",
                            _id="safety-equipment",
                            name="safety_equipment",
                            rows=3
                        ),
                        cls="safety-info-section"
                    ),
                    
                    # Technical specification section
                    Div(
                        H5("Technische Spezifikationen"),
                        LabelTextArea(
                            label="Spezifikationen",
                            _id="tech-specs",
                            name="tech_specs",
                            rows=3
                        ),
                        LabelInput(
                            label="Wartungsplan",
                            _id="tech-maintenance",
                            name="tech_maintenance"
                        ),
                        LabelInput(
                            label="Letzte Inspektion",
                            type="date",
                            _id="tech-last-inspection",
                            name="tech_last_inspection"
                        ),
                        cls="tech-specs-section"
                    ),
                    
                    # Documents section
                    Div(
                        H5("Dokumente"),
                        Upload(
                            Button("Dokument hinzufügen", cls="document-upload-btn"),
                            id="document-upload",
                            name="document_upload",
                            multiple=True,
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                        ),
                        Div(
                            P("Keine Dokumente angehängt", id="no-documents-message"),
                            Ul(
                                id="documents-list",
                                cls="documents-list"
                            ),
                            cls="documents-container"
                        ),
                        cls="documents-section"
                    ),
                    
                    # Save button
                    Button(
                        "Sicherheitsinformationen speichern",
                        type="button",
                        id="save-safety-info-btn",
                        cls="save-safety-btn"
                    ),
                    id="safety-info-form",
                    cls="safety-info-form hidden"
                ),
                cls="safety-info-sidebar"
            ),
            cls="safety-info-container hidden",
            id="view-mode-sidebar"
        ),
        
        # Main canvas area
        Div(
            Div(
                # Canvas for the floor plan
                Canvas(
                    width=800, height=600, id="floorplan-canvas",
                    data_floorplan=floorplan_id,
                    data_width=floorplan.width,
                    data_height=floorplan.height,
                    data_user=user_id
                ),
                cls="canvas-container"
            ),
            cls="editor-main"
        ),
        
        # Right sidebar for properties
        Div(
            Card(
                H4("Eigenschaften"),
                Div(id="element-properties", cls="properties-panel"),
                cls="properties-sidebar"
            ),
            cls="properties-container",
            id="properties-sidebar"
        ),
        
        # Bottom toolbar
        Div(
            Button("Speichern", hx_post=save_floorplan.to(floorplan_id=floorplan_id), hx_target="#save-status"),
            Button("Als PNG exportieren", id="export-png", onclick=f"exportFloorplanToPNG('{floorplan_id}')"),
            Button("Zurück zur Übersicht", hx_get=load_floorplan, hx_target="#floorplan-container"),
            Div(id="save-status"),
            cls="bottom-toolbar"
        ),
        
        cls="floorplan-editor",
        id="floorplan-editor-container",
        hx_ext="ws",
        ws_connect=f"/ws/floorplan/{floorplan_id}",
        hx_swap_oob="true"
    )

# Save floor plan
@rt("/save_floorplan/{floorplan_id}", methods=["POST"])
def save_floorplan(req, floorplan_id: str, elements: str = "[]"):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        floorplan_id_int = int(floorplan_id)
        floorplan = get_floorplan_from_db(floorplan_id_int, user_id)
        if not floorplan:
            return Div("Fehler: Grundriss nicht gefunden oder keine Berechtigung", cls="error-message")
        
        # Update elements in the data
        elements_data = json.loads(elements)
        floorplan.data["elements"] = elements_data
        
        # Update in database
        success = update_floorplan_in_db(floorplan_id_int, floorplan.data)
        if not success:
            return Div("Fehler beim Speichern in der Datenbank", cls="error-message")
        
        # Also upload to S3 for backup
        s3_key = upload_floorplan_to_s3(floorplan_id, floorplan.data)
        if not s3_key:
            return Div("Grundriss in Datenbank gespeichert, aber S3-Backup fehlgeschlagen", cls="warning-message")
        
        return Div("Grundriss erfolgreich gespeichert", cls="success-message", hx_swap_oob="true")
    except Exception as e:
        return Div(f"Fehler beim Speichern des Grundrisses: {str(e)}", cls="error-message")

# Save safety information
@rt("/save_safety_info/{floorplan_id}/{element_id}", methods=["POST"])
def save_safety_info(req, floorplan_id: str, element_id: str, safety_data: str = "{}"):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        floorplan_id_int = int(floorplan_id)
        floorplan = get_floorplan_from_db(floorplan_id_int, user_id)
        if not floorplan:
            return Div("Fehler: Grundriss nicht gefunden oder keine Berechtigung", cls="error-message")
        
        # Find the element and update its safety information
        safety_info = json.loads(safety_data)
        for element in floorplan.data.get("elements", []):
            if element.get("id") == element_id:
                # Make sure properties exist
                if "properties" not in element:
                    element["properties"] = {}
                # Update properties with safety info
                for key, value in safety_info.items():
                    element["properties"][key] = value
                # Update in database
                success = update_floorplan_in_db(floorplan_id_int, floorplan.data)
                if not success:
                    return Div("Fehler beim Speichern in der Datenbank", cls="error-message")
                
                return Div("Sicherheitsinformationen erfolgreich gespeichert", cls="success-message")
        
        return Div("Element nicht gefunden", cls="error-message")
    except Exception as e:
        return Div(f"Fehler beim Speichern der Sicherheitsinformationen: {str(e)}", cls="error-message")

# Upload document for an element
@rt("/upload_document/{floorplan_id}/{element_id}", methods=["POST"])
async def upload_document(req, floorplan_id: str, element_id: str):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        floorplan_id_int = int(floorplan_id)
        
        # Verify user has access to this floorplan
        floorplan = get_floorplan_from_db(floorplan_id_int, user_id)
        if not floorplan:
            return Div("Fehler: Grundriss nicht gefunden oder keine Berechtigung", cls="error-message")
        
        form = await req.form()
        
        # Get the uploaded file
        upload_file = form.get("document_upload")
        if not upload_file:
            return Div("Keine Datei hochgeladen", cls="error-message")
        
        # Read file data
        file_data = await upload_file.read()
        
        # Upload to S3
        s3_key = upload_document_to_s3(floorplan_id, element_id, file_data, upload_file.filename)
        if not s3_key:
            return Div("Fehler beim Hochladen zur S3", cls="error-message")
        
        # Add document metadata to database
        doc_id = add_document_to_db(floorplan_id_int, element_id, upload_file.filename, s3_key)
        if not doc_id:
            return Div("Dokument hochgeladen, aber Metadaten konnten nicht gespeichert werden", cls="warning-message")
        
        # Get updated documents list
        documents = get_element_documents(floorplan_id_int, element_id, user_id)
        
        # Return the updated document list
        return document_list_html(documents)
    except Exception as e:
        return Div(f"Fehler beim Hochladen des Dokuments: {str(e)}", cls="error-message")

# Get documents list for an element
@rt("/get_documents/{floorplan_id}/{element_id}", methods=["GET"])
def get_documents(req, floorplan_id: str, element_id: str):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        floorplan_id_int = int(floorplan_id)
        documents = get_element_documents(floorplan_id_int, element_id, user_id)
        return document_list_html(documents)
    except Exception as e:
        return Div(f"Fehler beim Abrufen der Dokumente: {str(e)}", cls="error-message")

# Helper function to generate HTML for document list
def document_list_html(documents):
    if not documents:
        return P("Keine Dokumente angehängt", id="no-documents-message")
    
    items = []
    for doc in documents:
        items.append(
            Li(
                A(
                    doc.get("filename", "Unbenanntes Dokument"),
                    href=doc.get("url", "#"),
                    target="_blank"
                ),
                Span(f" (Hinzugefügt: {format_date(doc.get('upload_date', 'Unbekanntes Datum'))})", cls="document-date"),
                cls="document-item"
            )
        )
    
    return Ul(*items, id="documents-list", cls="documents-list")

# WebSocket handler for real-time collaboration
@app.ws('/ws/floorplan/{floorplan_id}')
async def floorplan_ws(msg: str, send, floorplan_id: str, req):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert", id="update-message")
    
    # Verify user has access to this floorplan
    floorplan = get_floorplan_from_db(int(floorplan_id), user_id)
    if not floorplan:
        return Div("Keine Berechtigung für diesen Grundriss", id="update-message")
    
    # Broadcast changes to all clients
    try:
        update = json.loads(msg)
        return Div(f"Element {update.get('id', 'unbekannt')} aktualisiert", id="update-message")
    except:
        return Div("Ungültige Aktualisierung empfangen", id="update-message")

# Start the server
serve()
