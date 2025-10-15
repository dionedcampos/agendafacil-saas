// Importa as funções necessárias da nova versão (v2) do SDK
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();

// Define a região para as funções (importante para performance e localização)
setGlobalOptions({ region: "southamerica-east1" });

// Importa as credenciais da Twilio de forma segura
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = require("twilio")(accountSid, authToken);

// Esta é a nossa Cloud Function, reescrita com a nova sintaxe
exports.enviarConfirmacaoWhatsapp = onDocumentCreated("negocios/{negocioId}/agendamentos/{agendamentoId}", async (event) => {
    // Pega os dados do agendamento que foi criado
    const agendamento = event.data.data();
    const negocioId = event.params.negocioId;

    // Log para depuração (veremos isso nos logs do Firebase)
    logger.info(`Novo agendamento criado: ${event.params.agendamentoId}`, agendamento);

    try {
        // 1. Buscar o nome do serviço
        const servicoDoc = await admin.firestore()
            .collection("negocios").doc(negocioId)
            .collection("servicos").doc(agendamento.servicoId)
            .get();
        
        if (!servicoDoc.exists) {
            logger.error("Serviço não encontrado:", agendamento.servicoId);
            return;
        }
        const nomeServico = servicoDoc.data().nome;

        // 2. Formatar a data e hora
        const dataHora = new Date(agendamento.dataHoraInicio);
        const dataFormatada = dataHora.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
        const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo"
        });

        // 3. Montar a mensagem
        const mensagem = `Olá, ${agendamento.nomeCliente}! Seu agendamento para o serviço "${nomeServico}" no dia ${dataFormatada} às ${horaFormatada} foi confirmado com sucesso.`;

        // 4. Enviar a mensagem via Twilio
        // ATENÇÃO: Formate o número do cliente para o padrão E.164 (+5511999998888)
        const numeroClienteFormatado = `+${agendamento.telefoneCliente.replace(/\D/g, '')}`;

        const response = await client.messages.create({
            body: mensagem,
            from: "whatsapp:+14155238886", // Número da Sandbox da Twilio
            to: `whatsapp:${numeroClienteFormatado}`,
        });
        
        logger.info("Mensagem enviada com sucesso! SID:", response.sid);

    } catch (error) {
        logger.error("Erro ao enviar WhatsApp:", error);
    }
});
