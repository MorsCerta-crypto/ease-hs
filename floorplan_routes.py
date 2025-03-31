from fasthtml.common import *
from monsterui.all import *
import json
from datetime import datetime
from db import *
from s3 import upload_floorplan_to_s3,generate_s3_document_url,upload_document_to_s3
from authentication import ar
from floorplan_editor import floorplan_editor, sidebar_tools, properties_panel, safety_info_panel, create_svg_elements

# Floorplans dashboard

ar = APIRouter()
@ar.get("/floorplans")
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
                    Button("Neuer Grundriss", hx_get="/create_floorplan", hx_target="#floorplan-content", hx_swap="innerHTML"),
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
                # Add a div with ID that will be targeted by HTMX
                Div(
                    id="floorplan-content",
                    # Initial load of floorplans
                    hx_get="/load_floorplan",
                    hx_trigger="load",
                    hx_swap="innerHTML"
                ),
                id="floorplan-container",
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

# Create a new floor plan - updated to target floorplan-content
@ar.get("/create_floorplan")
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
                Button("Erstellen", type="submit", hx_post="/initialize_floorplan", hx_target="#floorplan-content", hx_swap="innerHTML")
            )
        )
    )

# Initialize a floor plan - updated to target floorplan-content
@ar.post("/initialize_floorplan")
def initialize_floorplan(sess, name: str, width: float, height: float):
    # Get current user ID
    user_id = sess.get('auth')
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
            Button("Zurück", hx_get="/load_floorplan", hx_target="#floorplan-content", hx_swap="innerHTML")
        )
    
    return Div(
        f"Grundriss erfolgreich erstellt. {floorplan.id}",
        hx_get=f"/floorplan_editor/{floorplan.id}",
        hx_target="#floorplan-content",
        hx_trigger="load delay:500ms",
        hx_swap="innerHTML"
    )

# Load existing floor plans - updated to work with floorplan-content
@ar.get("/load_floorplan")
def load_floorplan(sess):
    # Get current user ID
    user_id = sess.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    # Get list of floor plans for current user from database
    user_floorplans = get_user_floorplans(user_id)
    
    if not user_floorplans:
        return Card(
            H3("Keine Grundrisse gefunden"),
            P("Sie haben noch keine Grundrisse erstellt. Erstellen Sie einen neuen, um zu beginnen."),
            Button("Neu erstellen", hx_get="/create_floorplan", hx_target="#floorplan-content", hx_swap="innerHTML")
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
                            Td(Button("Öffnen", hx_get=f"/floorplan_editor/{plan.id}", hx_target="#floorplan-content", hx_swap="innerHTML"))
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
@ar.get("/floorplan_editor/{floorplan_id}")
def floorplan_editor_route(req, floorplan_id: int):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    # Load floor plan data from database
    if floorplan_id:
        try:
            floorplan = get_floorplan_from_db(floorplan_id, user_id)
            if not floorplan:
                return Card(
                    H3("Fehler"),
                    P("Der Grundriss konnte nicht geladen oder gehört nicht zu Ihrem Konto."),
                    Button("Zurück", hx_get="/load_floorplan", hx_target="#floorplan-content")
                )
            
            # Convert elements to JSON string for embedding in template
            floorplan_elements_json = json.dumps(floorplan.data.get('elements', []))
        except Exception as e:
            print(e)
            return Card(
                H3("Fehler"),
                P("Der Grundriss konnte nicht geladen werden."),
                Button("Zurück", hx_get="/load_floorplan", hx_target="#floorplan-content")
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
                            class_="hidden"
                        ),
                        Span("Bearbeiten", id="edit-label", class_="px-3 py-1 cursor-pointer bg-blue-500 text-white rounded-l-md"),
                        Span("Ansicht", id="view-label", class_="px-3 py-1 cursor-pointer bg-gray-200 rounded-r-md"),
                        class_="flex"
                    ),
                    class_="inline-block"
                ),
                class_="flex items-center space-x-2"
            ),
            class_="bg-white p-4 border-b border-gray-200"
        ),
        
        # Main content area with sidebar and editor
        Div(
            # Left sidebar
            Div(
                # Contains both edit tools and safety info panels
                sidebar_tools(),
                safety_info_panel(),
                id="left-sidebar",
                class_="border-r border-gray-200"
            ),
            
            # Main editor area - using our floorplan_editor component
            Div(
                floorplan_editor(
                    floorplan_id=floorplan_id,
                    user_id=user_id,
                    floorplan_data=floorplan.data,
                    floorplan_width=floorplan.width,
                    floorplan_height=floorplan.height,
                    floorplan_elements_json=floorplan_elements_json
                ),
                class_="flex-1 h-full"
            ),
            
            # Right sidebar for properties
            Div(
                properties_panel(),
                id="right-sidebar",
                class_="border-l border-gray-200"
            ),
            
            class_="flex flex-1 overflow-hidden"
        ),
        
        # Bottom toolbar with buttons
        Div(
            Button("Speichern", 
                   hx_post=f"/save_floorplan/{floorplan_id}", 
                   hx_include="#floorplan-data",
                   hx_target="#save-status",
                   class_="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"),
            Button("Als PNG exportieren", 
                   id="export-png", 
                   class_="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"),
            Button("Zurück zur Übersicht", 
                   hx_get="/load_floorplan", 
                   hx_target="#floorplan-content",
                   class_="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"),
            Div(id="save-status", class_="ml-4 text-sm"),
            class_="bg-white p-4 border-t border-gray-200 flex items-center space-x-2"
        ),
        
        # JavaScript utility functions for SVG element creation
        create_svg_elements(),
        
        class_="flex flex-col h-screen",
        id="floorplan-editor-container",
        hx_ext="ws",
        ws_connect=f"/ws/floorplan/{floorplan_id}"
    )

# Export floorplan as PNG
@ar.get("/export_floorplan/{floorplan_id}")
def export_floorplan(req, floorplan_id: int):
    # This endpoint would normally generate a PNG file
    # For now, just return a success message
    return Div("Der Export-Funktionalität wird in der JavaScript-Integration implementiert", 
               cls="info-message")

# Save floor plan with updated route to receive elements from form data
@ar.post("/save_floorplan/{floorplan_id}")
def save_floorplan(req, floorplan_id: int):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        # Get the floorplan from database
        floorplan = get_floorplan_from_db(floorplan_id, user_id)
        if not floorplan:
            return Div("Fehler: Grundriss nicht gefunden oder keine Berechtigung", cls="error-message")
        
        # Get the form data or JSON from the request
        if req.headers.get('content-type') == 'application/json':
            data = req.json()
            elements_data = data.get('elements', [])
        else:
            # Get data from the hidden input field
            elements_json = req.form.get('floorplan-data', '[]')
            elements_data = json.loads(elements_json)
        
        # Update elements in the floorplan data
        floorplan.data["elements"] = elements_data
        
        # Update in database
        success = update_floorplan_in_db(floorplan_id, floorplan.data)
        if not success:
            return Div("Fehler beim Speichern in der Datenbank", cls="error-message")
        
        # Also upload to S3 for backup
        s3_key = upload_floorplan_to_s3(floorplan_id, floorplan.data)
        if not s3_key:
            return Div("Grundriss in Datenbank gespeichert, aber S3-Backup fehlgeschlagen", cls="warning-message")
        
        return Div("Grundriss erfolgreich gespeichert", cls="success-message")
    except Exception as e:
        return Div(f"Fehler beim Speichern des Grundrisses: {str(e)}", cls="error-message")

# Save safety information
@ar.post("/save_safety_info/{floorplan_id}/{element_id}")
def save_safety_info(req, floorplan_id: int, element_id: str, safety_data: str = "{}"):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        floorplan = get_floorplan_from_db(floorplan_id, user_id)
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
                success = update_floorplan_in_db(floorplan_id, floorplan.data)
                if not success:
                    return Div("Fehler beim Speichern in der Datenbank", cls="error-message")
                
                return Div("Sicherheitsinformationen erfolgreich gespeichert", cls="success-message")
        
        return Div("Element nicht gefunden", cls="error-message")
    except Exception as e:
        return Div(f"Fehler beim Speichern der Sicherheitsinformationen: {str(e)}", cls="error-message")

# Upload document for an element
@ar.post("/upload_document/{floorplan_id}/{element_id}")
async def upload_document(req, floorplan_id: int, element_id: str):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        
        # Verify user has access to this floorplan
        floorplan = get_floorplan_from_db(floorplan_id, user_id)
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
        doc_id = add_document_to_db(floorplan_id, element_id, upload_file.filename, s3_key)
        if not doc_id:
            return Div("Dokument hochgeladen, aber Metadaten konnten nicht gespeichert werden", cls="warning-message")
        
        # Get updated documents list
        documents = get_element_documents(floorplan_id, element_id, user_id)
        
        # Return the updated document list
        return document_list_html(documents)
    except Exception as e:
        return Div(f"Fehler beim Hochladen des Dokuments: {str(e)}", cls="error-message")

# Get documents list for an element
@ar.get("/get_documents/{floorplan_id}/{element_id}")
def get_documents(req, floorplan_id: int, element_id: str):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert. Bitte melden Sie sich an.", cls="error-message")
    
    try:
        documents = get_element_documents(floorplan_id, element_id, user_id)
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
@ar.ws('/ws/floorplan/{floorplan_id}')
async def floorplan_ws(msg: str, send, floorplan_id: int, req):
    # Get current user ID
    user_id = req.session.get('auth')
    if not user_id:
        return Div("Nicht autorisiert", id="update-message")
    
    # Verify user has access to this floorplan
    floorplan = get_floorplan_from_db(floorplan_id, user_id)
    if not floorplan:
        return Div("Keine Berechtigung für diesen Grundriss", id="update-message")
    
    # Broadcast changes to all clients
    try:
        update = json.loads(msg)
        return Div(f"Element {update.get('id', 'unbekannt')} aktualisiert", id="update-message")
    except:
        return Div("Ungültige Aktualisierung empfangen", id="update-message")
