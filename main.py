from fasthtml.common import *
from monsterui.all import *
from pathlib import Path
from src.floorplan import ar, floorplans
from src.element_routes import er
from datetime import datetime

# Initialize FastHTML app with blue theme
app, rt = fast_app(live=True,
    hdrs=(
        Theme.zinc.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
    ),
)
ar.to_app(app)
er.to_app(app)
# Home route
@app.get("/")
def index():
    # Hero section
    hero = Section(
        Container(
            DivVStacked(
                DivCentered(
                    H1("EHS-Manager: Sicherheit digitalisieren", cls=TextT.center),
                    Subtitle("Optimieren Sie Ihre Arbeitssicherheit mit digitalen Grundrissen, Dokumentenverwaltung und Compliance-Tracking", cls=TextT.center),
                    Div(
                        A("Jetzt starten", href="/create_floorplan", cls=f"{ButtonT.primary} text-lg px-6 py-3 mr-4"),
                        A("Grundrisse anzeigen", href="/floorplans", cls=f"{ButtonT.secondary} text-lg px-6 py-3"),
                        cls="mt-8 flex justify-center space-x-4"
                    ),
                    cls="max-w-3xl mx-auto"
                ),
                cls="py-20"
            ),
            cls=ContainerT.xl
        ),
        cls=(SectionT.primary, "rounded-b-lg")
    )
    
    # Features section
    features = Section(
        Container(
            H2("Alle Funktionen in einer Plattform", cls="text-center mb-12"),
            Grid(
                Card(
                    CardBody(
                        DivCentered(UkIcon("home", width=48, height=48, cls="mb-4 text-primary")),
                        H3("Grundriss-Editor", cls="text-center mb-4"),
                        P("Erstellen Sie digitale Grundrisse Ihrer Anlagen und platzieren Sie Maschinen, Sicherheitsschränke und Notfallausrüstung an ihrem genauen Standort.", cls="text-center")
                    ),
                    cls=CardT.hover
                ),
                Card(
                    CardBody(
                        DivCentered(UkIcon("database", width=48, height=48, cls="mb-4 text-primary")),
                        H3("Ausrüstungsmanagement", cls="text-center mb-4"),
                        P("Dokumentieren Sie alle wichtigen Informationen zu Ihren Maschinen und Sicherheitsausrüstungen, wie Wartungspläne, Betriebsanleitungen und Prüftermine.", cls="text-center")
                    ),
                    cls=CardT.hover
                ),
                Card(
                    CardBody(
                        DivCentered(UkIcon("file-text", width=48, height=48, cls="mb-4 text-primary")),
                        H3("Dokumentenverwaltung", cls="text-center mb-4"),
                        P("Laden Sie alle relevanten Unterlagen hoch und verknüpfen Sie diese direkt mit den entsprechenden Anlagen oder Bereichen in Ihrem Grundriss.", cls="text-center")
                    ),
                    cls=CardT.hover
                ),
                Card(
                    CardBody(
                        DivCentered(UkIcon("users", width=48, height=48, cls="mb-4 text-primary")),
                        H3("Mitarbeiterqualifikationen", cls="text-center mb-4"),
                        P("Verfolgen Sie, ob Ihre Mitarbeiter die erforderlichen Schulungen und Qualifikationen für bestimmte Maschinen oder Arbeitsbereiche besitzen.", cls="text-center")
                    ),
                    cls=CardT.hover
                ),
                cols=2,
                cols_lg=4,
                cls="gap-8"
            ),
            cls=ContainerT.xl
        ),
        cls="py-20",
        id="features"
    )
    
    # Benefits section
    benefits = Section(
        Container(
            Grid(
                DivCentered(
                    H2("Warum EHS-Manager?", cls="mb-8"),
                    Div(cls="space-y-6")(
                        DivLAligned(
                            UkIcon("check", cls="mr-3 text-success"),
                            P("Reduzieren Sie Compliance-Risiken durch lückenlose Dokumentation")
                        ),
                        DivLAligned(
                            UkIcon("check", cls="mr-3 text-success"),
                            P("Sparen Sie Zeit bei Audits durch schnellen Zugriff auf alle relevanten Unterlagen")
                        ),
                        DivLAligned(
                            UkIcon("check", cls="mr-3 text-success"),
                            P("Verbessern Sie die Sicherheitskultur durch transparente Prozesse")
                        ),
                        DivLAligned(
                            UkIcon("check", cls="mr-3 text-success"),
                            P("Optimieren Sie Arbeitsabläufe durch gezielte EHS-Analysen")
                        ),
                        DivLAligned(
                            UkIcon("check", cls="mr-3 text-success"),
                            P("Senken Sie Unfallkosten durch präventives Sicherheitsmanagement")
                        )
                    ),
                    cls="flex flex-col justify-center"
                ),
                DivCentered(
                    Img(src="/static/images/dashboard-preview.jpg", alt="EHS-Manager Dashboard Preview", cls="rounded-lg shadow-xl"),
                    cls="mt-8 lg:mt-0"
                ),
                cols=1,
                cols_lg=2,
                cls="gap-12 items-center"
            ),
            cls=ContainerT.xl
        ),
        cls=(SectionT.muted, "py-20")
    )
    
    # Pricing Section
    pricing = Section(
        Container(
            DivCentered(
                H2("Transparente Preisgestaltung", cls="text-center mb-4"),
                Subtitle("Wählen Sie das Paket, das am besten zu Ihren Anforderungen passt", cls="text-center mb-12"),
                cls="max-w-3xl mx-auto"
            ),
            Grid(
                Card(
                    CardHeader(H3("Starter", cls="text-center")),
                    CardBody(
                        DivCentered(
                            H2("€99", cls="text-4xl font-bold text-center"),
                            P("pro Jahr", cls="text-center text-muted-foreground"),
                            Div(
                                Ul(cls=(ListT.bullet, "space-y-2 my-6"))(
                                    Li("Bis zu 5 Grundrisse"),
                                    Li("Grundlegende Dokumentenverwaltung"),
                                    Li("E-Mail-Support"),
                                    Li("1 Administrator-Benutzer"),
                                    Li("Monatliche Sicherheits-Updates")
                                ),
                                cls="text-left"
                            ),
                            Button("Jetzt starten", cls=f"{ButtonT.primary} w-full mt-6"),
                            cls="space-y-2"
                        )
                    ),
                    cls="border-border"
                ),
                Card(
                    CardHeader(H3("Professional", cls="text-center")),
                    CardBody(
                        DivCentered(
                            H2("€199", cls="text-4xl font-bold text-center"),
                            P("pro Jahr", cls="text-center text-muted-foreground"),
                            Div(
                                Ul(cls=(ListT.bullet, "space-y-2 my-6"))(
                                    Li("Unbegrenzte Grundrisse"),
                                    Li("Erweiterte Dokumentenverwaltung"),
                                    Li("Prioritäts-Support"),
                                    Li("Bis zu 10 Benutzer"),
                                    Li("Mitarbeiter-Qualifikations-Tracking"),
                                    Li("Compliance-Berichte")
                                ),
                                cls="text-left"
                            ),
                            Button("Jetzt starten", cls=f"{ButtonT.primary} w-full mt-6"),
                            cls="space-y-2"
                        )
                    ),
                    cls="border-primary shadow-lg relative"
                ),
                Card(
                    CardHeader(H3("Enterprise", cls="text-center")),
                    CardBody(
                        DivCentered(
                            H2("€399", cls="text-4xl font-bold text-center"),
                            P("pro Jahr", cls="text-center text-muted-foreground"),
                            Div(
                                Ul(cls=(ListT.bullet, "space-y-2 my-6"))(
                                    Li("Unbegrenzte Grundrisse"),
                                    Li("Vollständige Dokumentenverwaltung"),
                                    Li("24/7 Premium-Support"),
                                    Li("Unbegrenzte Benutzer"),
                                    Li("Benutzerdefinierte Integrationen"),
                                    Li("Fortgeschrittene Analyse-Tools"),
                                    Li("Dedizierter Account-Manager")
                                ),
                                cls="text-left"
                            ),
                            Button("Kontaktieren Sie uns", cls=f"{ButtonT.ghost} w-full mt-6", data_uk_toggle="target: #contact-modal"),
                            cls="space-y-2"
                        )
                    ),
                    cls="border-border"
                ),
                cols=1,
                cols_md=3,
                cls="gap-8 max-w-5xl mx-auto"
            ),
            cls=ContainerT.xl
        ),
        cls="py-20",
        id="pricing"
    )
    
    # About Section
    about = Section(
        Container(
            DivCentered(
                H2("Über uns", cls="text-center mb-4"),
                Subtitle("Erfahren Sie mehr über unsere Mission und unser Team", cls="text-center mb-12"),
                cls="max-w-3xl mx-auto"
            ),
            Grid(
                DivCentered(
                    Img(src="/static/images/team.jpg", alt="EHS-Manager Team", cls="rounded-lg shadow-xl"),
                    cls="order-2 lg:order-1"
                ),
                DivCentered(
                    H3("Unsere Mission", cls="mb-6"),
                    Div(
                        P("Bei EHS-Manager glauben wir, dass Arbeitssicherheit und Gesundheitsschutz nicht nur gesetzliche Verpflichtungen sind, sondern fundamentale Unternehmensverantwortung. Unsere Mission ist es, Unternehmen dabei zu unterstützen, sichere Arbeitsumgebungen zu schaffen und gleichzeitig ihre Produktivität zu steigern.", cls="mb-4"),
                        P("Unser Team aus Sicherheitsexperten, Ingenieuren und Softwareentwicklern arbeitet eng zusammen, um innovative Lösungen zu entwickeln, die komplexe EHS-Anforderungen vereinfachen und digitalisieren.", cls="mb-4"),
                    cls='max-w-2xl'),
                    H4("Unsere Werte:", cls="mb-4 mt-6"),
                    Ul(cls=ListT.bullet)(
                        Li("Sicherheit hat höchste Priorität"),
                        Li("Innovation durch Erfahrung"),
                        Li("Benutzerfreundlichkeit"),
                        Li("Datenschutz und Sicherheit"),
                        Li("Kontinuierliche Verbesserung")
                    ),
                    cls="flex flex-col justify-center order-1 lg:order-2"
                ),
                cols=1,
                cols_lg=2,
                cls="gap-12 items-center"
            ),
            cls=ContainerT.xl
        ),
        cls=(SectionT.muted, "py-20"),
        id="about"
    )
    
    # Contact Modal
    contact_modal = Modal(
        ModalHeader(
            ModalTitle("Kontaktieren Sie uns"),
            ModalCloseButton(UkIcon("x")),
        ),
        ModalBody(
            Form(
                LabelInput("Name", id="contact-name", placeholder="Ihr Name"),
                LabelInput("Unternehmen", id="contact-company", placeholder="Ihr Unternehmen"),
                LabelInput("E-Mail", id="contact-email", placeholder="ihre.email@beispiel.de", type="email"),
                LabelInput("Telefon", id="contact-phone", placeholder="Ihre Telefonnummer"),
                LabelSelect(
                    Options("Preise", "Demo anfragen", "Technischer Support", "Sonstiges"),
                    label="Betreff", 
                    id="contact-subject"
                ),
                LabelTextArea("Nachricht", id="contact-message", placeholder="Wie können wir Ihnen helfen?"),
                cls="space-y-4"
            )
        ),
        ModalFooter(
            DivRAligned(
                Button("Abbrechen", cls=ButtonT.ghost, data_uk_toggle="target: #contact-modal"),
                Button("Absenden", cls=ButtonT.primary),
                cls="space-x-2"
            )
        ),
        id="contact-modal"
    )
    
    # Call to action
    cta = Section(
        Container(
            Card(
                CardBody(
                    DivCentered(
                        H2("Bereit, Ihre EHS-Prozesse zu optimieren?", cls="text-center mb-4"),
                        P("Starten Sie noch heute mit EHS-Manager und erleben Sie, wie einfach modernes Sicherheitsmanagement sein kann.", cls="text-center mb-8"),
                        Button("Grundriss erstellen", href="/create_floorplan", cls=f"{ButtonT.primary} text-lg px-6 py-3"),
                        cls="py-8"
                    )
                ),
                cls="shadow-xl"
            ),
            cls=ContainerT.lg
        ),
        cls="py-20"
    )
    
    # Floorplan section - preview of the main functionality
    floorplan_preview = Section(
        Container(
            H2("Digitalisieren Sie Ihre Grundrisse", cls="text-center mb-12"),
            Grid(
                DivCentered(
                    Img(src="/static/images/floorplan-editor.jpg", alt="Grundriss-Editor", cls="rounded-lg shadow-xl"),
                    cls="order-2 lg:order-1"
                ),
                DivCentered(
                    H3("Intuitiver Grundriss-Editor", cls="mb-6"),
                    Div(cls="space-y-4")(
                        P("Mit unserem benutzerfreundlichen Editor erstellen Sie detaillierte digitale Grundrisse Ihrer Anlagen:"),
                        Ul(cls=ListT.bullet)(
                            Li("Maßstabsgetreue Darstellung von Gebäuden und Räumen"),
                            Li("Platzierung von Maschinen, Sicherheitseinrichtungen und Notfallausrüstung"),
                            Li("Farbliche Kennzeichnung von Gefahrenzonen"),
                            Li("Einfache Aktualisierung bei Änderungen")
                        ),
                        DivCentered(Button("Grundriss erstellen", href="/create_floorplan", cls=ButtonT.primary))
                    ),
                    cls="flex flex-col justify-center order-1 lg:order-2"
                ),
                cols=1,
                cols_lg=2,
                cls="gap-12 items-center"
            ),
            cls=ContainerT.xl
        ),
        cls="py-20"
    )
    
    # Main navigation
    navbar = NavBar(
        A("Home", href="/", cls="font-bold"),
        A("Funktionen", href="#features"),
        A("Preise", href="#pricing"),
        A("Über uns", href="#about"),
        A("Kontakt", href="#", data_uk_toggle="target: #contact-modal"),
        DivLAligned(
            A("Anmelden", href="/login", cls=ButtonT.ghost),
            A("Floorplans", href="/floorplans", cls=ButtonT.primary)
        ),
        brand=DivLAligned(
            UkIcon("shield", width=32, height=32, cls="mr-2 text-primary"),
            H3("EHS-Manager")
        ),
        sticky=True
    )
    
    # Combine all sections into the landing page
    return Title("EHS-Manager - Digitales Sicherheitsmanagement"),\
           navbar,\
           hero,\
           features,\
           floorplan_preview,\
           benefits,\
           pricing,\
           about,\
           cta,\
           contact_modal,\
           Section(
               Container(
                   DivCentered(
                       UkIcon("shield", width=24, height=24, cls="mr-2"),
                       P("© 2025 EASE. Alle Rechte vorbehalten.")
                   ),
                   cls=ContainerT.xl
               ),
               cls="py-8 bg-muted"
           )

# Display floorplans page
@app.get("/floorplans")
def floorplans_page():
    # Get list of floor plans from database
    db_floorplans = floorplans(where='user_id=?', where_args=(1,))
    
    table_content = []
    if db_floorplans:
        for plan in db_floorplans:
            # Format the date
            updated_date = datetime.fromisoformat(plan.updated_at).strftime("%d.%m.%Y %H:%M")
            
            # Create row with actions
            table_content.append(Tr(
                Td(plan.name),
                Td(f"{plan.width}m × {plan.height}m"),
                Td(updated_date),
                Td(
                    A("Bearbeiten", href=f"/edit-floorplan/{plan.id}", cls=ButtonT.default),
                    A("Anzeigen", href=f"/show-floorplan/{plan.id}", cls=ButtonT.default),
                    Button("Löschen", hx_delete=f"/delete-floorplan/{plan.id}", hx_target="closest tr", hx_swap="outerHTML", cls=ButtonT.destructive)
                )
            ))
    
    floorplan_table = Table(
        Thead(Tr(
            Th("Name"),
            Th("Abmessungen"),
            Th("Zuletzt aktualisiert"),
            Th("Aktionen")
        )),
        Tbody(*table_content if table_content else [Tr(Td("Keine Grundrisse gefunden", colspan="4", cls="uk-text-center"))]),
        cls="uk-table uk-table-divider uk-table-hover"
    )
    
    return Titled(
        "Environment Health Safety",
        NavBar(
            A("Home", href="/"),
            A('Benachrichtigungen', href="/notifications"),
            A("Neuer Grundriss", href="/create_floorplan", cls="uk-button uk-button-primary"),
        ),
        Container(
            Card(
                CardHeader(H3("Meine Grundrisse")),
                CardBody(floorplan_table),
                CardFooter(P("Klicken Sie auf 'Bearbeiten', um einen Grundriss zu ändern oder 'Anzeigen' für eine schreibgeschützte Ansicht."))
            ),
            cls=("mt-5", "uk-container-xl")
        )
    )

serve(reload=True)
