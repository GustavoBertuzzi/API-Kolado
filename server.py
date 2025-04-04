import requests
import re

# API do Octadesk
OCTADESK_API_URL = "secreto"
OCTADESK_API_KEY = "secreto"

# API do Omie
OMIE_API_URL = "secreto"
OMIE_APP_KEY = "secreto"
OMIE_APP_SECRET = "secreto"

# Função para buscar o CPF ou CNPJ no customFields
def get_cpf_cnpj_from_custom_fields(custom_fields):
    # Tentando encontrar o CPF ou CNPJ diretamente dentro dos customFields
    for field in custom_fields:
        if field.get("key") and (
            "cpf" in field["key"].lower() or "cnpj" in field["key"].lower()
        ):
            return field.get("value")
    return None

# Função para validar os dados obrigatórios do cliente
def validar_contato(contato):
    cpf_cnpj = get_cpf_cnpj_from_custom_fields(contato.get("customFields", []))

    if not cpf_cnpj:
        print(f"Contato com ID {contato.get('id')} não possui CPF ou CNPJ. Sincronização ignorada.")
        return False

    # Limpa o CPF ou CNPJ de espaços e outros caracteres não numéricos
    contato["cnpj_cpf"] = re.sub(r"\D", "", cpf_cnpj).strip()  # Removendo qualquer coisa que não seja número

    if not contato["cnpj_cpf"] or (
        len(contato["cnpj_cpf"]) != 11 and len(contato["cnpj_cpf"]) != 14
    ):
        print(f"CPF ou CNPJ inválido para o cliente com ID {contato.get('id')}. Sincronização ignorada.")
        return False

    return True

# Função para obter todos os contatos do Octadesk
def get_all_octadesk_contacts():
    headers = {
        "accept": "application/json",
        "X-API-KEY": OCTADESK_API_KEY,
    }
    response = requests.get(OCTADESK_API_URL, headers=headers)

    if response.status_code != 200:
        error_details = response.text
        raise Exception(
            f"Erro ao obter contatos do Octadesk. Status: {response.status_code}, Detalhes: {error_details}"
        )

    return response.json()

# Função para verificar ou atualizar dados no Omie
def check_or_update_in_omie(contact):
    codigo_cliente_integracao = f"CodigoInterno{contact.get('id')}"  # Assumindo que o ID do Octadesk seja único e será usado como código interno

    print(f"Consultando cliente no Omie com codigo_cliente_integracao: {codigo_cliente_integracao}")

    search_payload = {
        "call": "ListarClientes",
        "app_key": OMIE_APP_KEY,
        "app_secret": OMIE_APP_SECRET,
        "param": [
            {
                "codigo_cliente_integracao": codigo_cliente_integracao,  # Usando o codigo_cliente_integracao
            }
        ],
    }

    response = requests.post(OMIE_API_URL, json=search_payload)

    if response.status_code != 200:
        error_details = response.text
        raise Exception(
            f"Erro ao consultar cliente no Omie. Status: {response.status_code}, Detalhes: {error_details}"
        )

    result = response.json()
    cliente_existente = result.get("cliente_cadastro", [])[0] if result.get("cliente_cadastro") else None

    if cliente_existente:
        print(f"Cliente encontrado no Omie: {cliente_existente.get('codigo_cliente_omie')}")

        # Comparar e atualizar dados
        if cliente_existente.get("razao_social") != contact.get("razao_social"):
            cliente_existente["razao_social"] = contact.get("razao_social")

        if cliente_existente.get("email") != contact.get("email"):
            cliente_existente["email"] = f"{cliente_existente.get('email')};{contact.get('email')}"

        # Enviar atualização para o Omie
        update_payload = {
            "call": "AlterarCliente",
            "app_key": OMIE_APP_KEY,
            "app_secret": OMIE_APP_SECRET,
            "cliente": cliente_existente,
        }

        update_response = requests.post(OMIE_API_URL, json=update_payload)

        if update_response.status_code != 200:
            update_error_details = update_response.text
            raise Exception(
                f"Erro ao atualizar cliente no Omie. Status: {update_response.status_code}, Detalhes: {update_error_details}"
            )

        print("Cliente atualizado com sucesso no Omie.")
    else:
        print("Cliente não encontrado no Omie. Nenhuma ação tomada.")

# Função principal para sincronizar todos os clientes
def sync_all_customers():
    try:
        contacts = get_all_octadesk_contacts()

        for contact in contacts:
            if not validar_contato(contact):
                continue

            check_or_update_in_omie(contact)
    except Exception as error:
        print(f"Erro durante a sincronização: {error}")

# Iniciar a sincronização
if __name__ == "__main__":
    sync_all_customers()