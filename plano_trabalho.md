🛠️ Fase 1: Infraestrutura e Segurança (Supabase)

Objetivo: Configurar o ambiente sem interferir nos dados existentes.

    [ ] Criar Bucket no Storage: Criar um bucket chamado product-assets com políticas de acesso (RLS) que permitam leitura pública e escrita apenas para usuários autenticados.

    [ ] Esquema de Banco de Dados (New Only): Criar uma nova tabela chamada ext_product_images para não conflitar com o esquema atual.
    SQL

    CREATE TABLE ext_product_images (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      product_code text NOT NULL,
      file_path text NOT NULL,
      resolution_type text CHECK (resolution_type IN ('high', 'low')),
      position int DEFAULT 0,
      public_url text,
      created_at timestamptz DEFAULT now()
    );

    [ ] Configurar RLS: Habilitar Row Level Security na nova tabela.

🔐 Fase 2: Autenticação e Layout Base

Objetivo: Interface simples para gestão.

    [ ] Página de Login: Criar uma view simples (/login) utilizando Supabase Auth (Email/Senha).

    [ ] Middleware de Proteção: Garantir que as rotas de upload e visualização exijam sessão ativa.

📤 Fase 3: Módulo de Upload e Processamento

Objetivo: Upload múltiplo com padronização de nomenclatura.

    [ ] Componente de Upload Múltiplo:

        Input para Cód Produto.

        Seleção de múltiplos arquivos.

        Seleção de Tipagem (Alta ou Baixa).

    [ ] Lógica de Nomenclatura: Implementar função para renomear arquivos no padrão:
    {codigo_produto}_{tipo}_{timestamp}_{posicao}.ext

    [ ] Processamento de Upload:

        Subir para o bucket product-assets.

        Salvar o registro na tabela ext_product_images.

        Gerar a public_url persistente para uso do integrador parceiro.

🖼️ Fase 4: Visualização e Galeria

Objetivo: Consulta rápida e obtenção de links para o integrador.

    [ ] Página de Consulta:

        Campo de busca por Cód Produto.

        Grid de resultados exibindo apenas miniaturas (low res).

    [ ] Visualizador de Detalhes:

        Ao selecionar o produto, listar todas as imagens associadas.

        Botão "Copiar Link Público" (para o integrador).

        Botão "Download Alta Resolução".

🔌 Fase 5: Preparação para Integrador (API)

Objetivo: Facilitar a subida de pedidos para marketplaces.

    [ ] Documentação de Consulta: Criar um guia rápido (ou endpoint de borda) que retorne o JSON das imagens de um produto baseado no product_code para que o integrador parceiro possa consumir via API padrão do Supabase.

⚠️ Premissas e Regras Críticas

    Isolamento: Nenhuma instrução ALTER TABLE ou UPDATE deve ser executada em tabelas que não sejam a ext_product_images.

    Armazenamento: Imagens de alta resolução devem ser mantidas originais; imagens de baixa podem ser tratadas no cliente antes do upload para economizar banda (opcional).

    Persistência: A public_url gerada deve ser a referência oficial para o integrador de marketplaces.