# -*- coding: utf-8 -*-
# Intent knowledge base, keyed by URL slug of the Halifax service page.
# kw   = high-signal keywords / colloquialisms a citizen would actually say
# ex   = realistic natural-language utterances (voice or text)
# vs   = disambiguation rules against sibling intents
KB = {
"report-a-pothole": dict(
 kw=["road surface","falling apart","broken road","road crumbling","rough road","damaged pavement road","pothole","pot hole","sinkhole","sink hole","hole in the road","hole in the street","crater","road damage","pavement hole","broken asphalt","damaged road surface","rut","depression in road"],
 ex=["There's a huge pothole on Robie Street that nearly blew my tire",
     "A sinkhole opened up in the middle of my street",
     "The road surface is falling apart near the intersection",
     "Big hole in the pavement outside my house, cars are swerving",
     "Can someone fix the crater on Quinpool Road"],
 vs={"walking-surface-maintenance":"Pothole = roadway/driving surface. If the damage is on a SIDEWALK or walkway, use walking-surface-maintenance.",
     "utility-related-street-cuts-trenches":"If the hole is a utility trench/cut left by a contractor, use utility-related-street-cuts-trenches."}),

"walking-surface-maintenance": dict(
 kw=["sidewalk","footpath","walkway","pavement","uneven sidewalk","cracked sidewalk","trip hazard","tripping","raised slab","curb ramp","walking surface","broken sidewalk","asphalt walkway"],
 ex=["The sidewalk is cracked and I tripped on it",
     "Uneven slabs on the footpath outside the school",
     "The walkway in front of my building is a trip hazard",
     "Sidewalk pavement is broken and lifting"],
 vs={"report-a-pothole":"Sidewalk/walkway surface, not the road.",
     "new-sidewalk-request":"This is REPAIR of an existing sidewalk; a request for a NEW sidewalk goes to new-sidewalk-request.",
     "snow-damage":"If a plow damaged it in winter, use snow-damage."}),

"new-sidewalk-request": dict(
 kw=["new sidewalk","build a sidewalk","install sidewalk","no sidewalk","add a sidewalk","sidewalk needed","want a sidewalk"],
 ex=["There is no sidewalk on our street and kids walk on the road",
     "Can you build a sidewalk along this stretch",
     "We need a new sidewalk installed on Main Street"],
 vs={"walking-surface-maintenance":"NEW construction request, not repair of an existing sidewalk."}),

"street-lighting-concerns": dict(
 kw=["streetlight","street light","street lamp","lamp post","light out","light is out","burnt out light","flickering light","dark street","no lighting","lamppost","light pole"],
 ex=["The streetlight in front of my house has been out for two weeks",
     "Street lamp is flickering all night",
     "Our whole street is dark, the lights aren't working",
     "Burnt out light on the corner of Agricola and North"],
 vs={"lights-parks-playground-fields":"Street/roadway lighting. Lighting in a PARK, playground, sports field or court goes to lights-parks-playground-fields."}),

"lights-parks-playground-fields": dict(
 kw=["park walkway light","trail lighting","lights in park out","field lighting","park light","playground light","field light","sports light","ball diamond light","court light","tennis court lights","lighting in the park","trail light","walkway light in park"],
 ex=["The lights on the ball diamond aren't turning on",
     "Playground lighting is broken at the community park",
     "Can you turn on the lights at the tennis court",
     "The lights along the park walkway are out"],
 vs={"street-lighting-concerns":"Lighting on municipal PARK / field / playground property, not a street."}),

"graffiti-removal": dict(
 kw=["graffiti","tagging","tagged","spray paint","vandalism paint","scrawl","defaced wall","painted on wall","marker on wall"],
 ex=["Someone spray painted graffiti on the underpass",
     "There's tagging all over the bus shelter",
     "The wall by the park has been defaced with graffiti",
     "Can you remove the spray paint from the fence"],
 vs={}),

"trees": dict(
 kw=["branches","overhanging","hanging over road","tree limb","hitting buses","scraping","low branches","tree","branch","limb","fallen tree","tree down","overhanging branch","dead tree","tree pruning","trim tree","stump","roots","tree blocking","leaning tree","broken branch"],
 ex=["A tree fell down across the sidewalk",
     "There's a dead tree that looks like it might fall on my house",
     "Branches are hanging over the road and hitting buses",
     "Can someone trim the tree in front of my property",
     "Big limb broke off in the storm and is blocking the path"],
 vs={"vegetation-maintenance":"Trees specifically. General brush/overgrowth along the right-of-way goes to vegetation-maintenance.",
     "landscaping":"Shrubs, flower beds and ornamental planting go to landscaping.",
     "problem-plants-insects-invasive-species":"If it is an invasive/noxious plant or an insect problem, use problem-plants-insects-invasive-species."}),

"vegetation-maintenance": dict(
 kw=["overgrown","brush","bushes","weeds","vegetation","overgrowth","blocking sight line","obstructing view","hedge","undergrowth","clearing brush","overgrown along road"],
 ex=["The bushes at the corner are so overgrown I can't see traffic",
     "Vegetation is growing over the sidewalk",
     "Brush along the roadside needs clearing",
     "Weeds and overgrowth blocking the stop sign"],
 vs={"trees":"Brush / general vegetation, not an individual tree.",
     "grass":"If it is simply grass that needs mowing, use grass.",
     "landscaping":"Ornamental beds, shrubs and hanging baskets go to landscaping."}),

"grass": dict(
 kw=["grass","mowing","mow","cut the grass","long grass","lawn","uncut grass","overgrown grass","boulevard grass","field mowing"],
 ex=["The grass in the park hasn't been cut all summer",
     "Can you mow the boulevard in front of my house",
     "Long grass on the sports field needs cutting",
     "The lawn at the cemetery is overgrown"],
 vs={"vegetation-maintenance":"Grass cutting only; brush and overgrowth go to vegetation-maintenance.",
     "landscaping":"Beds and shrubs go to landscaping."}),

"landscaping": dict(
 kw=["hanging basket dead","dead flowers","planter","flower pot","median planting","shrub","flower bed","planting","hanging basket","pruning shrubs","foliage","garden bed","weeds in bed","rodent hole","ornamental"],
 ex=["The flower beds downtown need weeding",
     "Hanging baskets on the street look dead",
     "Shrubs in the median need pruning",
     "There are rodent holes in the shrub bed"],
 vs={"grass":"Beds/shrubs, not grass mowing.","trees":"Shrubs and beds, not trees."}),

"problem-plants-insects-invasive-species": dict(
 kw=["ticks","ants","fire ants","insects","bugs","infestation","hogweed","knotweed","nest of wasps","invasive species","noxious plant","japanese knotweed","giant hogweed","wild parsnip","goutweed","scotch broom","tick","wasp","hornet","bee","nest","fire ant","chinch bug","beetle","invasive animal","nuisance animal","poisonous plant"],
 ex=["There's giant hogweed growing beside the trail",
     "Japanese knotweed is spreading in the park",
     "A wasp nest on municipal property near the playground",
     "I found ticks in the park grass",
     "European fire ants all over the boulevard"],
 vs={"trees":"Species/pest problem, not general tree maintenance.",
     "deceased-animals":"Living pest/plant problem; a dead animal goes to deceased-animals."},
 slots={"species":"Map the named plant/insect to the `species` dropdown value."}),

"deceased-animals": dict(
 kw=["hit by a car","struck by vehicle","lying in the ditch","animal body","dead animal","deceased animal","roadkill","road kill","dead cat","dead dog","dead bird","dead deer","dead raccoon","carcass","dead marine life","dead whale","dead seal","animal remains"],
 ex=["There's a dead raccoon on the side of the road",
     "A deer was hit by a car and is lying in the ditch",
     "Dead bird in the playground",
     "There's a dead seal washed up on the beach"],
 vs={"problem-plants-insects-invasive-species":"Animal is dead; living nuisance animals go to problem-plants-insects-invasive-species."},
 slots={"animal_type":"Map the mentioned animal to the `animal_type` dropdown (Bird, Cat, Deer, Dog, Marine Life, Raccoon, Other Animal, Unknown)."}),

"illegally-parked-vehicle": dict(
 kw=["illegally parked","parked illegally","blocking my driveway","parked on sidewalk","fire lane","handicap spot","accessible spot","double parked","bus stop parking","no parking","abandoned car","parked in bike lane","winter parking ban","blocking crosswalk","parked too long"],
 ex=["A car is blocking my driveway and I can't get out",
     "Someone parked in the accessible spot without a permit",
     "There's a vehicle parked on the sidewalk",
     "Car has been parked in front of my house for a week",
     "Someone is double parked and blocking traffic",
     "A truck is parked in the fire lane"],
 vs={"obstructions":"A parked VEHICLE. Debris, carts or other objects go to obstructions.",
     "parking-permits":"A complaint, not a permit application."},
 slots={"alleged_violation":"Map to the `alleged_violation` dropdown. Options flagged (DISPATCH) are urgent and trigger immediate dispatch.",
        "vehicle_make":"Extract make","vehicle_model":"Extract model","vehicle_color":"Extract colour","vehicle_plate":"Extract licence plate"},
 urgency="Options marked (DISPATCH) — blocking driveway, fire lane on public property, on sidewalk, near hydrant/crosswalk/stop sign — are high priority."),

"obstructions": dict(
 kw=["obstruction","blocking the road","debris","garbage bags on road","shopping cart","fallen object","blocking traffic","blocking sidewalk","car accident debris","MVA debris","fluid on road","temporary sign blocking"],
 ex=["There's debris all over the road after a crash",
     "Shopping carts dumped in the middle of the bike lane",
     "Something is blocking the sidewalk and people can't get by",
     "Garbage bags left on the roadway"],
 vs={"illegally-parked-vehicle":"Objects/debris, not a parked vehicle.",
     "report-street-litter":"Something IMPEDING traffic or pedestrians; scattered litter goes to report-street-litter."}),

"report-street-litter": dict(
 kw=["garbage","trash","rubbish on sidewalk","trash bags","dumped","strewn","garbage bags","litter sidewalk","litter on street","trash on sidewalk","garbage on the street","rubbish","dumped garbage","litter","illegal dumping","mess on sidewalk"],
 ex=["There's garbage strewn all over the sidewalk",
     "Someone dumped trash bags on the street corner",
     "Lots of litter along the roadside"],
 vs={"report-park-litter":"Street or sidewalk; litter in a PARK or field goes to report-park-litter.",
     "obstructions":"Litter not blocking traffic.",
     "new-litter-bin-row-request":"A cleanup request, not a request for a new bin."}),

"report-park-litter": dict(
 kw=["garbage park","trash park","sports field garbage","beach litter","litter field","litter in park","garbage in park","trash in the park","litter on field","mess in playground","garbage at the beach","overflowing bin in park"],
 ex=["There's garbage all over the park after the weekend",
     "Trash left on the sports field",
     "The playground is covered in litter"],
 vs={"report-street-litter":"Park/field; streets and sidewalks go to report-street-litter.",
     "new-litter-bin-park-request":"A cleanup request, not a new bin."}),

"new-litter-bin-park-request": dict(
 kw=["garbage can playground","bin playground","garbage can park","add bin park","new litter bin in park","garbage can in park","trash bin park","need a bin in the park","add a garbage can park"],
 ex=["Can you put a garbage can in the playground area",
     "We need a litter bin at the park entrance"],
 vs={"new-litter-bin-row-request":"Bin located in a PARK; a bin on a street/sidewalk goes to new-litter-bin-row-request.",
     "report-park-litter":"Requesting a NEW bin, not reporting existing litter."}),

"new-litter-bin-row-request": dict(
 kw=["garbage can bus stop","no garbage can","bin at bus stop","add a bin street","litter bin sidewalk","new litter bin on street","garbage can on sidewalk","trash bin right of way","bin on the street","add garbage can downtown"],
 ex=["There's no garbage can at this bus stop, can you add one",
     "We need a litter bin on the sidewalk here"],
 vs={"new-litter-bin-park-request":"Bin in the right-of-way (street/sidewalk); a bin in a park goes to new-litter-bin-park-request."}),

"crosswalks": dict(
 kw=["crosswalk","cross walk","pedestrian crossing","zebra crossing","crosswalk paint","crossing faded","crosswalk lights","need a crosswalk","crossing signal button"],
 ex=["The crosswalk paint is completely faded and drivers don't stop",
     "We need a crosswalk at this intersection, it's dangerous",
     "The crosswalk flashing lights aren't working"],
 vs={"pavement-markings":"Crosswalk specifically; other road markings (lines, arrows, stop bars) go to pavement-markings.",
     "traffic-signals":"Pedestrian crosswalk; full traffic signals go to traffic-signals."}),

"pavement-markings": dict(
 kw=["lane lines","worn lines","white lines","yellow lines","line marking","road lines faded","highway lines","road markings","line painting","faded lines","centre line","lane markings","stop bar","road paint","arrows on road","bike lane markings","parking lines"],
 ex=["The lane lines on the highway are completely worn off",
     "Can you repaint the centre line on our road",
     "The stop bar at the intersection has faded away"],
 vs={"crosswalks":"General road markings; crosswalks go to crosswalks."}),

"traffic-signals": dict(
 kw=["light timing","signal timing","light too short","walk signal","advance green","left turn signal","traffic light","traffic signal","stop light","light not working","signal out","red light stuck","green light too short","signal timing","flashing red","pedestrian signal button"],
 ex=["The traffic light at the intersection is stuck on red",
     "Traffic signal is completely dark, it's dangerous",
     "The light timing is too short to cross",
     "Pedestrian button isn't working at the signal"],
 vs={"new-traffic-signal-request":"Problem with an EXISTING signal; asking for a new one goes to new-traffic-signal-request.",
     "street-lighting-concerns":"Traffic control signal, not a streetlight."}),

"new-traffic-signal-request": dict(
 kw=["stop light","stoplight","put a light","install a light","signal at corner","light at intersection","new traffic light","install traffic signal","need a stop light","request traffic signal","intersection needs a light"],
 ex=["This intersection is dangerous, we need a traffic light installed",
     "Can you put a stop light at this corner"],
 vs={"traffic-signals":"NEW signal request, not a malfunction.",
     "traffic-calming":"If the concern is speeding, use traffic-calming."}),

"traffic-calming": dict(
 kw=["speed bump","speed bumps","speed hump","racing","race","neighbourhood speeding","residential speeding","drivers too fast","kids safety street","calming measures","speeding","cars going too fast","speed bump","speed hump","traffic calming","slow down traffic","racing on our street","speed limit","dangerous driving"],
 ex=["Cars speed down our residential street all day",
     "Can we get speed bumps installed, it's not safe for kids",
     "Drivers are racing through the neighbourhood"],
 vs={"new-traffic-signal-request":"Speed/traffic calming concern, not a signal request."}),

"street-sign-missing-or-damaged": dict(
 kw=["street sign","stop sign","sign missing","sign knocked down","bent sign","damaged sign","street name sign","yield sign","sign fell"],
 ex=["The stop sign at the corner has been knocked down",
     "Our street name sign is missing",
     "A road sign is bent and unreadable"],
 vs={"row-signage":"Missing/damaged sign report. A request for a NEW sign in the right-of-way goes to row-signage.",
     "non-row-signage":"Signs in a PARK go to non-row-signage.",
     "election-signs":"Election campaign signs go to election-signs."}),

"row-signage": dict(
 kw=["children at play sign","new sign street","sign request street","install street sign","new street sign","install a sign","request a sign","need a sign on the street","no parking sign request","warning sign request"],
 ex=["Can you install a no-parking sign on this block",
     "We'd like a children-at-play sign on our street"],
 vs={"street-sign-missing-or-damaged":"NEW sign request in the right-of-way.",
     "non-row-signage":"Signs in a park go to non-row-signage."}),

"non-row-signage": dict(
 kw=["park sign","sign in the park","playground sign","trail sign","park sign damaged","sign complaint park"],
 ex=["The sign at the park entrance is broken",
     "We need a dog-on-leash sign in the park"],
 vs={"row-signage":"Sign located in a PARK, not the street right-of-way."}),

"election-signs": dict(
 kw=["campaign signs sidewalk","political signage","candidate signage","election signage","election sign","campaign sign","political sign","candidate sign","sign on the road election","oversized election sign"],
 ex=["There are campaign signs blocking the sidewalk",
     "An election sign is in a prohibited area",
     "Political signs are too big and blocking sight lines"],
 vs={"street-sign-missing-or-damaged":"Election/campaign signage specifically."}),

"flooding-requests": dict(
 kw=["flooding","flood","water in the street","street flooded","water pooling","blocked catch basin","standing water","drain blocked","water running into street","ditch overflowing"],
 ex=["The street is flooding, water is up to the curb",
     "A catch basin is blocked and water is pooling",
     "Water is running down the road into my driveway",
     "The ditch is overflowing onto the street"],
 vs={"drainage-infrastructure-maintenance-or-repair":"ACTIVE flooding happening now. If water is not currently flooding and it's an asset repair, use drainage-infrastructure-maintenance-or-repair."},
 urgency="Active flooding is time-sensitive; flag as high priority."),

"drainage-infrastructure-maintenance-or-repair": dict(
 kw=["catch basin","culvert","ditch","storm drain","street drain","drainage repair","broken catch basin","collapsed culvert","drain grate","damaged ditch"],
 ex=["The catch basin grate is broken and needs repair",
     "A culvert under my driveway has collapsed",
     "The ditch needs cleaning out, it's full of silt",
     "Storm drain cover is loose"],
 vs={"flooding-requests":"Repair/maintenance where flooding is NOT currently happening.",
     "drainage-infrastructure-request":"Repair of EXISTING drainage; a request for NEW drainage goes to drainage-infrastructure-request."}),

"drainage-infrastructure-request": dict(
 kw=["new catch basin","new culvert","new storm drain","install drainage","need a drain","add a culvert"],
 ex=["We need a new catch basin on this corner, water always pools",
     "Can you install a culvert under our driveway"],
 vs={"drainage-infrastructure-maintenance-or-repair":"NEW infrastructure request, not repair."}),

"curb-andor-gutter-maintenance": dict(
 kw=["curb","kerb","gutter","broken curb","curb damaged","gutter repair","curb crumbling","curb cut damaged"],
 ex=["The curb outside my house is crumbling",
     "Gutter along the street is broken",
     "Curb was damaged by a truck"],
 vs={"walking-surface-maintenance":"Curb/gutter specifically, not the sidewalk surface.",
     "snow-damage":"If a snow plow caused it, use snow-damage."}),

"road-shoulder": dict(
 kw=["edge of pavement","drop off","shoulder drop","road edge","pavement edge","road shoulder","shoulder of the road","soft shoulder","eroded shoulder","gravel shoulder","drop off at edge of road","shoulder washed out"],
 ex=["The shoulder of the road has washed away",
     "There's a big drop-off at the edge of the pavement",
     "Gravel shoulder needs grading"],
 vs={"report-a-pothole":"Damage on the shoulder/edge, not the travel lane."}),

"barrier-maintenance": dict(
 kw=["guardrail","guiderail","guide rail","railing","retaining wall","fence","barrier","handrail","damaged guardrail","broken railing","wall collapsing"],
 ex=["The guardrail on the highway is bent and damaged",
     "A railing along the walkway is loose and dangerous",
     "The retaining wall is starting to collapse",
     "Fence beside the road has been knocked down"],
 vs={"request-repairs":"Barrier in the road right-of-way; park/playground equipment repairs go to request-repairs."}),

"street-sweeping": dict(
 kw=["bike lane sand","sand","gravel","dirt","sweep","swept","road grit","winter sand","street sweeping","sweeper","sand on the road","dirt on street","sweep the street","gravel on road","street cleaning","spring sweeping"],
 ex=["Our street still has winter sand all over it",
     "Can you send a street sweeper, there's gravel everywhere",
     "The bike lane is full of dirt and sand"],
 vs={"report-street-litter":"Sweeping of sand/dirt/gravel, not litter pickup."}),

"snow-damage": dict(
 kw=["snow plow damage","plow damaged","snow damage","plow hit my lawn","sod damage from plow","mailbox knocked by plow","driveway damaged by plow","winter damage"],
 ex=["The snow plow tore up my lawn this winter",
     "A plow knocked over my mailbox",
     "Plow damaged the edge of my driveway"],
 vs={"walking-surface-maintenance":"Damage specifically caused by winter/plow operations."}),

"utility-related-street-cuts-trenches": dict(
 kw=["street cut","trench","utility dig","excavation","road cut","contractor dug up road","trench not repaired","uneven patch","utility work road"],
 ex=["A utility company dug up the road and never repaired it properly",
     "There's a sunken trench across the street from the gas work",
     "The patch from the street cut is uneven and rough"],
 vs={"report-a-pothole":"Damage from a utility cut/trench, not a natural pothole."}),

"cemeteries": dict(
 kw=["cemetery","headstone","gravestone","grave","tombstone","grave depression","fallen headstone","damaged headstone","burial ground"],
 ex=["A headstone has fallen over in the municipal cemetery",
     "There's a depression over a grave that needs filling",
     "The gravestone is damaged and leaning"],
 vs={},
 note="HRM-owned cemeteries only."),

"roadside-memorials": dict(
 kw=["roadside memorial","memorial","cross by the road","tribute at crash site","flowers at roadside","memorial marker"],
 ex=["I'd like to report a roadside memorial that was placed",
     "There's a memorial cross on the highway shoulder"],
 vs={"cemeteries":"Roadside memorial, not a cemetery grave."}),

"parks-inquiries": dict(
 kw=["park question","park inquiry","about the park","park hours","park general question","ask about a park"],
 ex=["I have a general question about the park near me",
     "Who do I talk to about park opening hours"],
 vs={"parks-infrastructure-requests":"General inquiry; requests for park equipment/infrastructure go to parks-infrastructure-requests.",
     "request-repairs":"Inquiry, not a repair report."}),

"parks-infrastructure-requests": dict(
 kw=["picnic table","new bench park","park amenity","trail bench","bike rack park","water fountain park","install in park","park infrastructure","new bench in park","park equipment request","add equipment park","park amenity request","picnic table request"],
 ex=["Can you add a picnic table to the park",
     "We'd like a bench installed along the trail"],
 vs={"row-bench":"Bench in a PARK; a bench on the street right-of-way goes to row-bench.",
     "request-repairs":"NEW infrastructure, not a repair."}),

"request-repairs": dict(
 kw=["slide","swing","play structure","playground equipment","climbing frame","monkey bars","seesaw","park bench broken","cracked slide","unsafe equipment","playground broken","park equipment broken","swing broken","slide damaged","bench broken in park","fix playground","damaged play structure","park repair"],
 ex=["The swing set at the playground is broken",
     "A slide in the park is cracked and unsafe",
     "The bench in the park is falling apart",
     "Play structure needs repair"],
 vs={"parks-infrastructure-requests":"REPAIR of existing equipment, not a new installation.",
     "lights-parks-playground-fields":"Equipment repair; lighting issues go to lights-parks-playground-fields."}),

"row-bench": dict(
 kw=["bench on street","sidewalk bench","bus stop bench","bench right of way","new bench street","broken bench street"],
 ex=["Can we get a bench at this bus stop",
     "The bench on the sidewalk is damaged"],
 vs={"parks-infrastructure-requests":"Bench in the street right-of-way, not in a park."}),

"row-services-general-inquiries": dict(
 kw=["who maintains","responsible for road","general question road","who looks after","right of way question","general street inquiry","road question","who maintains this street","street general question"],
 ex=["I have a general question about street maintenance",
     "Who is responsible for maintaining this road"],
 vs={},
 note="Catch-all fallback for right-of-way questions that match no specific intent."),

"community-clean-adopt-a-highway": dict(
 kw=["community cleanup","adopt a highway","cleanup pickup","collect cleanup bags","volunteer cleanup","group cleanup"],
 ex=["We finished our community cleanup, can you pick up the bags",
     "Our Adopt-A-Highway group needs a collection scheduled"],
 vs={"report-street-litter":"Organized/registered cleanup program pickup, not a litter report."},
 note="Requester must already be registered in the program."),

"request-residential-refrigerant": dict(
 kw=["fridge","refrigerator","freezer","appliance pickup","old fridge","white goods","freon","air conditioner","AC unit","fridge pickup","refrigerator removal","freezer pickup","air conditioner disposal","refrigerant removal","heat pump disposal","dehumidifier pickup","appliance with freon"],
 ex=["I need my old fridge picked up",
     "How do I get rid of a freezer with refrigerant",
     "Need an air conditioner removed from my house"],
 vs={},
 slots={"number_of_items":"Extract the count of appliances.",
        "location_of_items_on_the_property":"inside / outside checkbox."}),

"parking-permits": dict(
 kw=["parking permit","residential parking permit","permit to park","apply for parking permit","visitor parking permit"],
 ex=["I need to apply for a residential parking permit",
     "How do I get a parking permit for my street"],
 vs={"illegally-parked-vehicle":"Permit application, not a complaint."}),

"parking-ticket-photo-request": dict(
 kw=["parking ticket photo","ticket photo","evidence photo ticket","photo of my ticket","dispute ticket photo"],
 ex=["I want the photo evidence for my parking ticket",
     "Can I see the picture taken when I got ticketed"],
 vs={},
 slots={"ticket_number":"Extract ticket number.","license_plate":"Extract plate."}),

"alarm-registration": dict(
 kw=["alarm registration","register alarm","security alarm","burglar alarm permit","alarm permit","register my alarm system"],
 ex=["I need to register my home security alarm",
     "How do I register a commercial alarm system"],
 vs={},
 slots={"this_registration_is_for":"Residential property owner / Commercial property owner / Business owner / Tenant."}),

"address-change-form": dict(
 kw=["change my address","update address","new mailing address","moved","address change","update my mailing address for taxes"],
 ex=["I moved and need to update my mailing address for property tax",
     "Change of address for my tax bill"],
 vs={},
 slots={"aan":"Assessment account number.","effective_date":"Date the change takes effect."}),

"outdoor-weddings": dict(
 kw=["wedding booking","book a park for wedding","outdoor wedding","wedding venue","rent park wedding","ceremony in park"],
 ex=["I want to book a park for my wedding ceremony",
     "How do I reserve an outdoor venue for a wedding"],
 vs={}),

"wedding-anniversary-message": dict(
 kw=["anniversary message","anniversary certificate","mayor anniversary","50th anniversary","congratulations anniversary"],
 ex=["My parents are celebrating their 50th anniversary, can the mayor send a message",
     "Requesting an anniversary certificate from the mayor"],
 vs={"birthday-message-mayor":"Anniversary, not birthday."}),

"birthday-message-mayor": dict(
 kw=["birthday message","birthday certificate","mayor birthday","100th birthday","90th birthday","milestone birthday"],
 ex=["My grandmother is turning 100, can the mayor send a birthday message",
     "Requesting a birthday greeting from the mayor"],
 vs={"wedding-anniversary-message":"Birthday, not anniversary."}),

"military-retirement-congratulatory-form": dict(
 kw=["military retirement","retiring from the military","armed forces retirement","congratulatory message military","navy retirement"],
 ex=["A colleague is retiring from the navy, can the mayor send congratulations"],
 vs={}),

"invitations-mayor-attend-public-events": dict(
 kw=["invite the mayor","mayor attend","mayor at our event","invitation mayor","mayor speak at event"],
 ex=["We'd like to invite the mayor to our community festival",
     "Can the mayor speak at our opening ceremony"],
 vs={}),

"hrfe-incident-feed": dict(kw=["fire incident feed","fire calls","recent fire incidents"],
 ex=["Where can I see recent fire department calls"], vs={}, note="Informational feed, not a submittable request."),
}
