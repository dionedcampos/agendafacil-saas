// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ELEMENTOS E VARIÁVEIS ---
const businessNameEl = document.getElementById('business-name');
const businessAddressEl = document.getElementById('business-address');
const serviceListContainer = document.getElementById('service-list');
const professionalListContainer = document.getElementById('professional-list');
const datePicker = document.getElementById('date-picker');
const timeSlotsContainer = document.getElementById('time-slots');
const confirmationForm = document.getElementById('confirmation-form');
const confirmationModalEl = document.getElementById('confirmationModal');
const confirmationModal = new bootstrap.Modal(confirmationModalEl);
let agendamentoAtual = {};
let businessId = null;

const sections = {
    service: document.getElementById('service-selection'),
    professional: document.getElementById('professional-selection'),
    time: document.getElementById('time-selection'),
    success: document.getElementById('success-message')
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const businessSlug = urlParams.get('negocio');
    datePicker.min = new Date().toISOString().split("T")[0];
    if (businessSlug) { loadBusinessInfo(businessSlug); } else { businessNameEl.textContent = "Negócio não encontrado"; }
    
    // Listeners de Navegação e Formulário
    document.getElementById('back-to-services').addEventListener('click', () => showSection('service'));
    document.getElementById('back-to-professionals').addEventListener('click', () => showSection('professional'));
    confirmationForm.addEventListener('submit', confirmAppointment);
});

// --- FUNÇÕES DE NAVEGAÇÃO ---
function showSection(sectionName) {
    Object.values(sections).forEach(section => section.classList.add('hidden'));
    sections[sectionName].classList.remove('hidden');
}

// --- CARREGAMENTO INICIAL ---
async function loadBusinessInfo(slug) {
    const businessQuery = await db.collection('negocios').where('slug', '==', slug).limit(1).get();
    if (businessQuery.empty) { businessNameEl.textContent = "Negócio não encontrado"; return; }
    const businessDoc = businessQuery.docs[0];
    const businessData = businessDoc.data();
    businessId = businessDoc.id;
    businessNameEl.textContent = businessData.nomeNegocio;
    businessAddressEl.textContent = businessData.endereco;

    const servicesQuery = await db.collection('negocios').doc(businessId).collection('servicos').get();
    serviceListContainer.innerHTML = '';
    servicesQuery.forEach(doc => {
        const service = doc.data();
        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 service-item shadow-sm" onclick="selectService('${doc.id}', '${service.nome}', ${service.duracao})">
                    <div class="card-body">
                        <h5 class="card-title">${service.nome}</h5>
                        <p class="card-text text-muted">${service.duracao} min • R$ ${service.preco.toFixed(2)}</p>
                    </div>
                </div>
            </div>`;
        serviceListContainer.innerHTML += cardHtml;
    });
}

// --- FLUXO DE AGENDAMENTO ---

async function selectService(serviceId, serviceName, serviceDuration) {
    agendamentoAtual = { serviceId, serviceName, serviceDuration };
    document.getElementById('selected-service-title').textContent = `Serviço: ${serviceName}`;
    professionalListContainer.innerHTML = '<div class="text-center">Carregando...</div>';
    showSection('professional');

    const profQuery = await db.collection('negocios').doc(businessId).collection('profissionais').where(`servicosOferecidos.${serviceId}`, '==', true).get();
    professionalListContainer.innerHTML = '';
    if (profQuery.empty) { professionalListContainer.innerHTML = '<p class="text-muted">Nenhum profissional oferece este serviço.</p>'; return; }
    profQuery.forEach(doc => {
        const professional = doc.data();
        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 professional-item shadow-sm" onclick="selectProfessional('${doc.id}', '${professional.nome}')">
                    <div class="card-body"><h5 class="card-title">${professional.nome}</h5></div>
                </div>
            </div>`;
        professionalListContainer.innerHTML += cardHtml;
    });
}

function selectProfessional(professionalId, professionalName) {
    agendamentoAtual.professionalId = professionalId;
    agendamentoAtual.professionalName = professionalName;
    document.getElementById('selected-professional-name').textContent = `Profissional: ${professionalName}`;
    datePicker.value = '';
    timeSlotsContainer.innerHTML = '<p class="text-muted">Selecione uma data acima.</p>';
    datePicker.onchange = () => generateAvailableTimeSlots(datePicker.value);
    showSection('time');
}

async function generateAvailableTimeSlots(date) {
    timeSlotsContainer.innerHTML = '<div class="text-center">Verificando horários...</div>';
    const professionalRef = await db.collection('negocios').doc(businessId).collection('profissionais').doc(agendamentoAtual.professionalId).get();
    const professional = professionalRef.data();
    const dayOfWeekIndex = new Date(`${date}T12:00:00`).getDay();
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaDaSemana = dias[dayOfWeekIndex];
    const workingHours = professional.horariosTrabalho[diaDaSemana];

    if (!workingHours || !workingHours.inicio || !workingHours.fim) { timeSlotsContainer.innerHTML = '<p class="text-danger">O profissional não trabalha neste dia.</p>'; return; }

    const possibleSlots = [];
    const startTime = new Date(`${date}T${workingHours.inicio}`);
    const endTime = new Date(`${date}T${workingHours.fim}`);
    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
        possibleSlots.push(new Date(currentTime));
        currentTime.setMinutes(currentTime.getMinutes() + agendamentoAtual.serviceDuration);
    }
    
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    const appointmentsQuery = await db.collection('negocios').doc(businessId).collection('agendamentos').where('profissionalId', '==', agendamentoAtual.professionalId).where('dataHoraInicio', '>=', startOfDay.toISOString()).where('dataHoraInicio', '<=', endOfDay.toISOString()).get();
    const bookedSlots = appointmentsQuery.docs.map(doc => new Date(doc.data().dataHoraInicio).getTime());
    
    timeSlotsContainer.innerHTML = '';
    const availableSlots = possibleSlots.filter(slot => !bookedSlots.includes(slot.getTime()));
    if(availableSlots.length === 0) { timeSlotsContainer.innerHTML = '<p class="text-muted">Nenhum horário disponível para esta data.</p>'; return;}
    
    availableSlots.forEach(slot => {
        const timeSlotDiv = document.createElement('div');
        timeSlotDiv.className = 'btn btn-outline-primary time-slot';
        timeSlotDiv.textContent = slot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        timeSlotDiv.onclick = () => selectTimeSlot(slot);
        timeSlotsContainer.appendChild(timeSlotDiv);
    });
}

function selectTimeSlot(dateObject) {
    agendamentoAtual.dataHoraInicio = dateObject;
    document.getElementById('conf-service-name').textContent = agendamentoAtual.serviceName;
    document.getElementById('conf-professional-name').textContent = agendamentoAtual.professionalName;
    document.getElementById('conf-date').textContent = dateObject.toLocaleDateString('pt-BR');
    document.getElementById('conf-time').textContent = dateObject.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    confirmationModal.show();
}

async function confirmAppointment(event) {
    event.preventDefault();
    const submitButton = confirmationForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando Solicitação...';

    const clientName = document.getElementById('client-name').value;
    const clientPhone = document.getElementById('client-phone').value;
    const dataHoraFim = new Date(agendamentoAtual.dataHoraInicio);
    dataHoraFim.setMinutes(dataHoraFim.getMinutes() + agendamentoAtual.serviceDuration);
    
    const finalAppointment = {
        servicoId: agendamentoAtual.serviceId,
        profissionalId: agendamentoAtual.professionalId,
        nomeCliente: clientName,
        telefoneCliente: clientPhone,
        dataHoraInicio: agendamentoAtual.dataHoraInicio.toISOString(),
        dataHoraFim: dataHoraFim.toISOString(),
        status: 'pendente' // <-- MUDANÇA AQUI
    };

    try {
        await db.collection('negocios').doc(businessId).collection('agendamentos').add(finalAppointment);
        confirmationModal.hide();
        // Mensagem de sucesso ajustada para refletir o status pendente
        document.getElementById('success-message').innerHTML = `
            <h2 class="display-5 text-warning">Solicitação Recebida!</h2>
            <p class="lead">Obrigado, <strong>${clientName}</strong>!</p>
            <p>Sua solicitação de agendamento foi enviada. Você receberá uma confirmação assim que o estabelecimento aprovar.</p>
        `;
        showSection('success');
    } catch (error) {
        console.error("Erro ao salvar agendamento: ", error);
        alert("Ocorreu um erro. Tente novamente.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar Agendamento';
    }
}