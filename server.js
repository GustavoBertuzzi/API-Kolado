const fetch = require("node-fetch");

// API do Octadesk
const octadeskApiUrl = "";
const octadeskApiKey = "";

// API do Omie
const omieApiUrl = "";
const omieAppKey = "";
const omieAppSecret = "";

// Função para buscar o CPF ou CNPJ no customFields
function getCpfCnpjFromCustomFields(customFields) {
  // Tentando encontrar o CPF ou CNPJ diretamente dentro dos customFields
  for (const field of customFields) {
    if (
      field.key &&
      (field.key.toLowerCase().includes("cpf") ||
        field.key.toLowerCase().includes("cnpj"))
    ) {
      return field.value;
    }
  }
  return null;
}

// Função para validar os dados obrigatórios do cliente
function validarContato(contato) {
  const cpfCnpj = getCpfCnpjFromCustomFields(contato.customFields);

  if (!cpfCnpj) {
    console.warn(
      `Contato com ID ${contato.id} não possui CPF ou CNPJ. Sincronização ignorada.`
    );
    return false;
  }

  // Limpa o CPF ou CNPJ de espaços e outros caracteres não numéricos
  contato.cnpj_cpf = cpfCnpj.replace(/\D/g, "").trim(); // Removendo qualquer coisa que não seja número

  if (
    !contato.cnpj_cpf ||
    (contato.cnpj_cpf.length !== 11 && contato.cnpj_cpf.length !== 14)
  ) {
    console.warn(
      `CPF ou CNPJ inválido para o cliente com ID ${contato.id}. Sincronização ignorada.`
    );
    return false;
  }

  return true;
}

// Função para obter todos os contatos do Octadesk
async function getAllOctadeskContacts() {
  const response = await fetch(octadeskApiUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-API-KEY": octadeskApiKey,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Erro ao obter contatos do Octadesk. Status: ${response.status}, Detalhes: ${errorDetails}`
    );
  }

  return await response.json();
}

// Função para verificar ou atualizar dados no Omie
async function checkOrUpdateInOmie(contact) {
  const codigoClienteIntegracao = `CodigoInterno${contact.id}`; // Assumindo que o ID do Octadesk seja único e será usado como código interno

  console.log(
    `Consultando cliente no Omie com codigo_cliente_integracao: ${codigoClienteIntegracao}`
  );

  const searchPayload = {
    call: "ListarClientes",
    app_key: omieAppKey,
    app_secret: omieAppSecret,
    param: [
      {
        codigo_cliente_integracao: codigoClienteIntegracao, // Usando o codigo_cliente_integracao
      },
    ],
  };

  const response = await fetch(omieApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(searchPayload),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Erro ao consultar cliente no Omie. Status: ${response.status}, Detalhes: ${errorDetails}`
    );
  }

  const result = await response.json();
  const clienteExistente = result.cliente_cadastro?.[0];

  if (clienteExistente) {
    console.log(
      `Cliente encontrado no Omie: ${clienteExistente.codigo_cliente_omie}`
    );

    // Comparar e atualizar dados
    if (clienteExistente.razao_social !== contact.razao_social) {
      clienteExistente.razao_social = contact.razao_social;
    }

    if (clienteExistente.email !== contact.email) {
      clienteExistente.email = `${clienteExistente.email};${contact.email}`;
    }

    // Enviar atualização para o Omie
    const updatePayload = {
      call: "AlterarCliente",
      app_key: omieAppKey,
      app_secret: omieAppSecret,
      cliente: clienteExistente,
    };

    const updateResponse = await fetch(omieApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const updateErrorDetails = await updateResponse.text();
      throw new Error(
        `Erro ao atualizar cliente no Omie. Status: ${updateResponse.status}, Detalhes: ${updateErrorDetails}`
      );
    }

    console.log("Cliente atualizado com sucesso no Omie.");
  } else {
    console.log("Cliente não encontrado no Omie. Nenhuma ação tomada.");
  }
}

// Função principal para sincronizar todos os clientes
async function syncAllCustomers() {
  try {
    const contacts = await getAllOctadeskContacts();

    for (const contact of contacts) {
      if (!validarContato(contact)) {
        continue;
      }

      await checkOrUpdateInOmie(contact);
    }
  } catch (error) {
    console.error("Erro durante a sincronização:", error.message);
  }
}

// Iniciar a sincronização
syncAllCustomers();
