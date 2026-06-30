export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bairro: {
        Row: {
          codbai: number
          codcid: number | null
          nomebai: string
        }
        Insert: {
          codbai: number
          codcid?: number | null
          nomebai: string
        }
        Update: {
          codbai?: number
          codcid?: number | null
          nomebai?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairro_codcid_fkey"
            columns: ["codcid"]
            isOneToOne: false
            referencedRelation: "cidade"
            referencedColumns: ["codcid"]
          },
        ]
      }
      carrinho: {
        Row: {
          atualizado_em: string
          cliente_id: string
          codprod: number
          criado_em: string
          id: number
          peso_total: number
          quantidade: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          codprod: number
          criado_em?: string
          id?: number
          peso_total?: number
          quantidade?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          codprod?: number
          criado_em?: string
          id?: number
          peso_total?: number
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "carrinho_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrinho_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
        ]
      }
      categoria: {
        Row: {
          codgrupopai: number | null
          codgrupoprod: number
          descr_grupo: string
        }
        Insert: {
          codgrupopai?: number | null
          codgrupoprod: number
          descr_grupo: string
        }
        Update: {
          codgrupopai?: number | null
          codgrupoprod?: number
          descr_grupo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_codgrupopai_fkey"
            columns: ["codgrupopai"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["codgrupoprod"]
          },
        ]
      }
      cidade: {
        Row: {
          codcid: number
          codibge: number | null
          nomecid: string
          uf: string | null
        }
        Insert: {
          codcid: number
          codibge?: number | null
          nomecid: string
          uf?: string | null
        }
        Update: {
          codcid?: number
          codibge?: number | null
          nomecid?: string
          uf?: string | null
        }
        Relationships: []
      }
      cliente: {
        Row: {
          codparc: number | null
          cpf_cnpj: string | null
          email: string | null
          id: string
          integracao_erro: string | null
          integracao_status: string | null
          is_admin: boolean
          nome: string | null
          telefone: string | null
        }
        Insert: {
          codparc?: number | null
          cpf_cnpj?: string | null
          email?: string | null
          id: string
          integracao_erro?: string | null
          integracao_status?: string | null
          is_admin?: boolean
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          codparc?: number | null
          cpf_cnpj?: string | null
          email?: string | null
          id?: string
          integracao_erro?: string | null
          integracao_status?: string | null
          is_admin?: boolean
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      embalagem: {
        Row: {
          altura: number | null
          codprod: number
          comprimento: number | null
          descrprod: string
          largura: number | null
          peso: number | null
        }
        Insert: {
          altura?: number | null
          codprod: number
          comprimento?: number | null
          descrprod: string
          largura?: number | null
          peso?: number | null
        }
        Update: {
          altura?: number | null
          codprod?: number
          comprimento?: number | null
          descrprod?: string
          largura?: number | null
          peso?: number | null
        }
        Relationships: []
      }
      endereco: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string | null
          codcid: number | null
          complemento: string | null
          id: number
          is_padrao: boolean
          logradouro: string | null
          numero: string | null
          tipo: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codcid?: number | null
          complemento?: string | null
          id?: number
          is_padrao?: boolean
          logradouro?: string | null
          numero?: string | null
          tipo?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codcid?: number | null
          complemento?: string | null
          id?: number
          is_padrao?: boolean
          logradouro?: string | null
          numero?: string | null
          tipo?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endereco_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endereco_codcid_fkey"
            columns: ["codcid"]
            isOneToOne: false
            referencedRelation: "cidade"
            referencedColumns: ["codcid"]
          },
        ]
      }
      especificacao: {
        Row: {
          codprod: number | null
          id_espec: number
          label: string
          valor: string
        }
        Insert: {
          codprod?: number | null
          id_espec?: number
          label: string
          valor: string
        }
        Update: {
          codprod?: number | null
          id_espec?: number
          label?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "especificacao_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
        ]
      }
      estoque: {
        Row: {
          codprod: number
          dt_atualizacao: string | null
          estoque_disponivel: number | null
          estoque_real: number | null
          proporcao: number | null
        }
        Insert: {
          codprod: number
          dt_atualizacao?: string | null
          estoque_disponivel?: number | null
          estoque_real?: number | null
          proporcao?: number | null
        }
        Update: {
          codprod?: number
          dt_atualizacao?: string | null
          estoque_disponivel?: number | null
          estoque_real?: number | null
          proporcao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: true
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
        ]
      }
      ext_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ext_product_images: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_path: string
          id: string
          is_featured: boolean
          position: number | null
          product_code: string
          public_url: string | null
          resolution_type: string | null
          thumb_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_path: string
          id?: string
          is_featured?: boolean
          position?: number | null
          product_code: string
          public_url?: string | null
          resolution_type?: string | null
          thumb_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_path?: string
          id?: string
          is_featured?: boolean
          position?: number | null
          product_code?: string
          public_url?: string | null
          resolution_type?: string | null
          thumb_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      log_integracao_pedido: {
        Row: {
          criado_em: string | null
          id: number
          payload_enviado: Json | null
          pedido_id: number | null
          resposta_recebida: Json | null
          status: string
          tentativa: number | null
        }
        Insert: {
          criado_em?: string | null
          id?: number
          payload_enviado?: Json | null
          pedido_id?: number | null
          resposta_recebida?: Json | null
          status: string
          tentativa?: number | null
        }
        Update: {
          criado_em?: string | null
          id?: number
          payload_enviado?: Json | null
          pedido_id?: number | null
          resposta_recebida?: Json | null
          status?: string
          tentativa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_integracao_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      log_sincronizacao: {
        Row: {
          entidade: string
          finalizado_em: string | null
          id: number
          iniciado_em: string | null
          mensagem_erro: string | null
          registros_processados: number | null
          status: string
        }
        Insert: {
          entidade: string
          finalizado_em?: string | null
          id?: number
          iniciado_em?: string | null
          mensagem_erro?: string | null
          registros_processados?: number | null
          status: string
        }
        Update: {
          entidade?: string
          finalizado_em?: string | null
          id?: number
          iniciado_em?: string | null
          mensagem_erro?: string | null
          registros_processados?: number | null
          status?: string
        }
        Relationships: []
      }
      parceiro: {
        Row: {
          cgc_cpf: string | null
          codparc: number
        }
        Insert: {
          cgc_cpf?: string | null
          codparc: number
        }
        Update: {
          cgc_cpf?: string | null
          codparc?: number
        }
        Relationships: []
      }
      pedido: {
        Row: {
          cliente_id: string | null
          dt_pedido: string | null
          endereco_id: number | null
          id: number
          log_erro_integracao: string | null
          metodo_pagamento: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          nunota: number | null
          peso_total: number | null
          status: string | null
          vlr_frete: number | null
          vlr_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          dt_pedido?: string | null
          endereco_id?: number | null
          id?: number
          log_erro_integracao?: string | null
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          nunota?: number | null
          peso_total?: number | null
          status?: string | null
          vlr_frete?: number | null
          vlr_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          dt_pedido?: string | null
          endereco_id?: number | null
          id?: number
          log_erro_integracao?: string | null
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          nunota?: number | null
          peso_total?: number | null
          status?: string | null
          vlr_frete?: number | null
          vlr_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "endereco"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_embalagem: {
        Row: {
          cenario: string
          criado_em: string
          embalagem_codprod: number | null
          id: number
          pedido_id: number
          peso_total: number
          quantidade_caixas: number
        }
        Insert: {
          cenario: string
          criado_em?: string
          embalagem_codprod?: number | null
          id?: number
          pedido_id: number
          peso_total?: number
          quantidade_caixas?: number
        }
        Update: {
          cenario?: string
          criado_em?: string
          embalagem_codprod?: number | null
          id?: number
          pedido_id?: number
          peso_total?: number
          quantidade_caixas?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_embalagem_embalagem_codprod_fkey"
            columns: ["embalagem_codprod"]
            isOneToOne: false
            referencedRelation: "embalagem"
            referencedColumns: ["codprod"]
          },
          {
            foreignKeyName: "pedido_embalagem_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_item: {
        Row: {
          codprod: number | null
          id: number
          pedido_id: number | null
          quantidade: number
          sequencia: number | null
          vlr_unitario: number
        }
        Insert: {
          codprod?: number | null
          id?: number
          pedido_id?: number | null
          quantidade: number
          sequencia?: number | null
          vlr_unitario: number
        }
        Update: {
          codprod?: number | null
          id?: number
          pedido_id?: number | null
          quantidade?: number
          sequencia?: number | null
          vlr_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
          {
            foreignKeyName: "pedido_item_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      preco: {
        Row: {
          codprod: number | null
          codtab: number
          dtalter: string | null
          id: number
          vlr_venda: number
        }
        Insert: {
          codprod?: number | null
          codtab: number
          dtalter?: string | null
          id?: number
          vlr_venda: number
        }
        Update: {
          codprod?: number | null
          codtab?: number
          dtalter?: string | null
          id?: number
          vlr_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "preco_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
        ]
      }
      produto: {
        Row: {
          altura: number | null
          codgrupoprod: number | null
          codprod: number
          codprodemb: number | null
          comnome: string | null
          comprimento: number | null
          desccurta: string | null
          descrprod: string
          descrprodoed: string | null
          dtalter: string | null
          largura: number | null
          peso: number | null
          qtdemb: number | null
          syncsite: string | null
        }
        Insert: {
          altura?: number | null
          codgrupoprod?: number | null
          codprod: number
          codprodemb?: number | null
          comnome?: string | null
          comprimento?: number | null
          desccurta?: string | null
          descrprod: string
          descrprodoed?: string | null
          dtalter?: string | null
          largura?: number | null
          peso?: number | null
          qtdemb?: number | null
          syncsite?: string | null
        }
        Update: {
          altura?: number | null
          codgrupoprod?: number | null
          codprod?: number
          codprodemb?: number | null
          comnome?: string | null
          comprimento?: number | null
          desccurta?: string | null
          descrprod?: string
          descrprodoed?: string | null
          dtalter?: string | null
          largura?: number | null
          peso?: number | null
          qtdemb?: number | null
          syncsite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_codgrupoprod_fkey"
            columns: ["codgrupoprod"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["codgrupoprod"]
          },
          {
            foreignKeyName: "produto_codprodemb_fkey"
            columns: ["codprodemb"]
            isOneToOne: false
            referencedRelation: "embalagem"
            referencedColumns: ["codprod"]
          },
        ]
      }
      produto_imagem: {
        Row: {
          codprod: number | null
          id: number
          ordem: number | null
          url: string
        }
        Insert: {
          codprod?: number | null
          id?: number
          ordem?: number | null
          url: string
        }
        Update: {
          codprod?: number | null
          id?: number
          ordem?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagem_codprod_fkey"
            columns: ["codprod"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["codprod"]
          },
        ]
      }
    }
    Views: {
      ext_product_images_summary: {
        Row: {
          high_count: number | null
          last_upload: string | null
          low_count: number | null
          manual_count: number | null
          product_code: string | null
          product_name: string | null
          promo_count: number | null
          thumb_url: string | null
          total_images: number | null
          video_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_embalagens_pedido: {
        Args: { p_pedido_id: number }
        Returns: undefined
      }
      check_is_admin: { Args: never; Returns: boolean }
      get_secret: { Args: { secret_name: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_produto_imagens: { Args: never; Returns: number }
      update_codibge_batch: { Args: { updates: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
