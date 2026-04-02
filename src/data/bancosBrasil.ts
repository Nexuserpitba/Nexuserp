// Lista completa de bancos brasileiros com código COMPE/ISPB
// Inclui bancos tradicionais, cooperativas e bancos digitais

export interface BancoInfo {
  codigo: string;
  ispb: string;
  nome: string;
  nomeReduzido: string;
  tipo: "comercial" | "digital" | "cooperativa" | "investimento" | "desenvolvimento" | "financeira" | "pagamento";
  cor?: string;
  corTexto?: string;
}

export const BANCOS_BRASIL: BancoInfo[] = [
  // ===== BANCOS TRADICIONAIS / COMERCIAIS =====
  { codigo: "001", ispb: "00000000", nome: "Banco do Brasil S.A.", nomeReduzido: "BB", tipo: "comercial", cor: "#FFCB05", corTexto: "#003882" },
  { codigo: "003", ispb: "04902979", nome: "Banco da Amazônia S.A.", nomeReduzido: "BASA", tipo: "comercial", cor: "#006B3F", corTexto: "#FFFFFF" },
  { codigo: "004", ispb: "07237373", nome: "Banco do Nordeste do Brasil S.A.", nomeReduzido: "BNB", tipo: "desenvolvimento", cor: "#C41230", corTexto: "#FFFFFF" },
  { codigo: "021", ispb: "28127603", nome: "Banestes S.A. Banco do Estado do Espírito Santo", nomeReduzido: "Banestes", tipo: "comercial", cor: "#003399", corTexto: "#FFFFFF" },
  { codigo: "024", ispb: "04866275", nome: "Banco Bandepe S.A.", nomeReduzido: "Bandepe", tipo: "comercial" },
  { codigo: "025", ispb: "03323840", nome: "Banco Alfa S.A.", nomeReduzido: "Alfa", tipo: "comercial" },
  { codigo: "029", ispb: "33657248", nome: "Banco Itaú Consignado S.A.", nomeReduzido: "Itaú Consig.", tipo: "comercial" },
  { codigo: "033", ispb: "90400888", nome: "Banco Santander (Brasil) S.A.", nomeReduzido: "Santander", tipo: "comercial", cor: "#EC0000", corTexto: "#FFFFFF" },
  { codigo: "036", ispb: "06271464", nome: "Banco Bradesco BBI S.A.", nomeReduzido: "Bradesco BBI", tipo: "investimento" },
  { codigo: "037", ispb: "09274232", nome: "Banco do Estado do Pará S.A.", nomeReduzido: "Banpará", tipo: "comercial", cor: "#00529B", corTexto: "#FFFFFF" },
  { codigo: "040", ispb: "03609817", nome: "Banco Cargill S.A.", nomeReduzido: "Cargill", tipo: "comercial" },
  { codigo: "041", ispb: "92702067", nome: "Banco do Estado do Rio Grande do Sul S.A.", nomeReduzido: "Banrisul", tipo: "comercial", cor: "#003399", corTexto: "#FFFFFF" },
  { codigo: "047", ispb: "03017677", nome: "Banco do Estado de Sergipe S.A.", nomeReduzido: "Banese", tipo: "comercial", cor: "#003882", corTexto: "#FFFFFF" },
  { codigo: "062", ispb: "03012230", nome: "Hipercard Banco Múltiplo S.A.", nomeReduzido: "Hipercard", tipo: "comercial" },
  { codigo: "063", ispb: "04184779", nome: "Banco Bradescard S.A.", nomeReduzido: "Bradescard", tipo: "comercial" },
  { codigo: "065", ispb: "48795256", nome: "Banco AndBank (Brasil) S.A.", nomeReduzido: "AndBank", tipo: "investimento" },
  { codigo: "066", ispb: "02801938", nome: "Banco Morgan Stanley S.A.", nomeReduzido: "Morgan Stanley", tipo: "investimento" },
  { codigo: "069", ispb: "61033106", nome: "Banco Crefisa S.A.", nomeReduzido: "Crefisa", tipo: "comercial" },
  { codigo: "070", ispb: "00000208", nome: "BRB - Banco de Brasília S.A.", nomeReduzido: "BRB", tipo: "comercial", cor: "#003882", corTexto: "#FFFFFF" },
  { codigo: "074", ispb: "03532415", nome: "Banco J. Safra S.A.", nomeReduzido: "J. Safra", tipo: "comercial" },
  { codigo: "075", ispb: "03532415", nome: "Banco ABN Amro S.A.", nomeReduzido: "ABN Amro", tipo: "investimento" },
  { codigo: "076", ispb: "07656500", nome: "Banco KDB do Brasil S.A.", nomeReduzido: "KDB", tipo: "comercial" },
  { codigo: "077", ispb: "00416968", nome: "Banco Inter S.A.", nomeReduzido: "Inter", tipo: "digital", cor: "#FF7A00", corTexto: "#FFFFFF" },
  { codigo: "082", ispb: "07679404", nome: "Banco Topázio S.A.", nomeReduzido: "Topázio", tipo: "comercial" },
  { codigo: "083", ispb: "10690848", nome: "Banco da China Brasil S.A.", nomeReduzido: "China Brasil", tipo: "comercial" },
  { codigo: "084", ispb: "02398976", nome: "Uniprime Norte do Paraná", nomeReduzido: "Uniprime NP", tipo: "cooperativa" },
  { codigo: "085", ispb: "02318507", nome: "Cooperativa Central de Crédito - Ailos", nomeReduzido: "Ailos", tipo: "cooperativa" },
  { codigo: "089", ispb: "62109566", nome: "Cooperativa de Crédito Rural da Região da Mogiana", nomeReduzido: "Credisan", tipo: "cooperativa" },
  { codigo: "091", ispb: "01634601", nome: "Cooperativa Central Unicred", nomeReduzido: "Unicred", tipo: "cooperativa", cor: "#00703C", corTexto: "#FFFFFF" },
  { codigo: "094", ispb: "11758741", nome: "Banco Finaxis S.A.", nomeReduzido: "Finaxis", tipo: "comercial" },
  { codigo: "096", ispb: "00997185", nome: "Banco B3 S.A.", nomeReduzido: "B3", tipo: "comercial" },
  { codigo: "098", ispb: "78632767", nome: "Credialiança Cooperativa de Crédito Rural", nomeReduzido: "Credialiança", tipo: "cooperativa" },
  { codigo: "104", ispb: "00360305", nome: "Caixa Econômica Federal", nomeReduzido: "CEF", tipo: "comercial", cor: "#005CA9", corTexto: "#FFFFFF" },
  { codigo: "107", ispb: "15114366", nome: "Banco Bocom BBM S.A.", nomeReduzido: "Bocom BBM", tipo: "comercial" },
  { codigo: "119", ispb: "13720915", nome: "Banco Western Union do Brasil S.A.", nomeReduzido: "Western Union", tipo: "comercial" },
  { codigo: "120", ispb: "33603457", nome: "Banco Rodobens S.A.", nomeReduzido: "Rodobens", tipo: "comercial" },
  { codigo: "121", ispb: "10664513", nome: "Banco Agibank S.A.", nomeReduzido: "Agibank", tipo: "digital", cor: "#7B2D8E", corTexto: "#FFFFFF" },
  { codigo: "125", ispb: "45246410", nome: "Banco Genial S.A.", nomeReduzido: "Genial", tipo: "investimento" },
  { codigo: "136", ispb: "00315557", nome: "Conf. Nac. das Cooperativas Centrais Unicred", nomeReduzido: "Unicred Central", tipo: "cooperativa" },
  { codigo: "169", ispb: "61088183", nome: "Banco Olé Bonsucesso Consignado S.A.", nomeReduzido: "Olé Consig.", tipo: "comercial" },
  { codigo: "184", ispb: "17298092", nome: "Banco Itaú BBA S.A.", nomeReduzido: "Itaú BBA", tipo: "investimento" },
  { codigo: "208", ispb: "30306294", nome: "Banco BTG Pactual S.A.", nomeReduzido: "BTG Pactual", tipo: "investimento", cor: "#001E3D", corTexto: "#FFFFFF" },
  { codigo: "212", ispb: "92894922", nome: "Banco Original S.A.", nomeReduzido: "Original", tipo: "digital", cor: "#00A651", corTexto: "#FFFFFF" },
  { codigo: "213", ispb: "54403563", nome: "Banco Arbi S.A.", nomeReduzido: "Arbi", tipo: "comercial" },
  { codigo: "217", ispb: "71027866", nome: "Banco John Deere S.A.", nomeReduzido: "John Deere", tipo: "comercial" },
  { codigo: "218", ispb: "71027866", nome: "Banco BS2 S.A.", nomeReduzido: "BS2", tipo: "digital", cor: "#000000", corTexto: "#00D4AA" },
  { codigo: "222", ispb: "75647891", nome: "Banco Credit Agricole Brasil S.A.", nomeReduzido: "Crédit Agricole", tipo: "investimento" },
  { codigo: "224", ispb: "58616418", nome: "Banco Fibra S.A.", nomeReduzido: "Fibra", tipo: "comercial" },
  { codigo: "233", ispb: "62421979", nome: "Banco Cifra S.A.", nomeReduzido: "Cifra", tipo: "comercial" },
  { codigo: "237", ispb: "60746948", nome: "Banco Bradesco S.A.", nomeReduzido: "Bradesco", tipo: "comercial", cor: "#CC092F", corTexto: "#FFFFFF" },
  { codigo: "241", ispb: "31597552", nome: "Banco Clássico S.A.", nomeReduzido: "Clássico", tipo: "comercial" },
  { codigo: "243", ispb: "33923798", nome: "Banco Máxima S.A.", nomeReduzido: "Máxima", tipo: "comercial" },
  { codigo: "246", ispb: "28195667", nome: "Banco ABC Brasil S.A.", nomeReduzido: "ABC Brasil", tipo: "comercial" },
  { codigo: "249", ispb: "61182408", nome: "Banco Investcred Unibanco S.A.", nomeReduzido: "Investcred", tipo: "comercial" },
  { codigo: "254", ispb: "14388334", nome: "Paraná Banco S.A.", nomeReduzido: "Paraná Banco", tipo: "comercial" },
  { codigo: "260", ispb: "18236120", nome: "Nu Pagamentos S.A. (Nubank)", nomeReduzido: "Nubank", tipo: "digital", cor: "#820AD1", corTexto: "#FFFFFF" },
  { codigo: "265", ispb: "33644196", nome: "Banco Fator S.A.", nomeReduzido: "Fator", tipo: "investimento" },
  { codigo: "269", ispb: "53518684", nome: "Banco HSBC S.A.", nomeReduzido: "HSBC", tipo: "comercial" },
  { codigo: "270", ispb: "61348538", nome: "Sagitur Distribuidora de Títulos e Valores Mobiliários", nomeReduzido: "Sagitur", tipo: "financeira" },
  { codigo: "274", ispb: "11495073", nome: "Money Plus SCMEPP Ltda", nomeReduzido: "Money Plus", tipo: "financeira" },
  { codigo: "276", ispb: "11970623", nome: "Banco Senff S.A.", nomeReduzido: "Senff", tipo: "comercial" },
  { codigo: "280", ispb: "23862762", nome: "Avista S.A. Crédito, Financiamento e Investimento", nomeReduzido: "Avista", tipo: "financeira" },
  { codigo: "290", ispb: "08561701", nome: "PagSeguro Internet S.A.", nomeReduzido: "PagBank", tipo: "digital", cor: "#00C853", corTexto: "#FFFFFF" },
  { codigo: "301", ispb: "13370835", nome: "BPP Instituição de Pagamento S.A.", nomeReduzido: "BPP", tipo: "pagamento" },
  { codigo: "318", ispb: "61186680", nome: "Banco BMG S.A.", nomeReduzido: "BMG", tipo: "comercial", cor: "#FF6B00", corTexto: "#FFFFFF" },
  { codigo: "320", ispb: "07450604", nome: "China Construction Bank (Brasil) Banco Múltiplo S.A.", nomeReduzido: "CCB Brasil", tipo: "comercial" },
  { codigo: "323", ispb: "21332862", nome: "Mercado Pago - Instituição de Pagamento", nomeReduzido: "Mercado Pago", tipo: "digital", cor: "#009EE3", corTexto: "#FFFFFF" },
  { codigo: "332", ispb: "04632856", nome: "Acesso Soluções de Pagamento S.A.", nomeReduzido: "Acesso", tipo: "pagamento" },
  { codigo: "335", ispb: "27098060", nome: "Banco Digio S.A.", nomeReduzido: "Digio", tipo: "digital", cor: "#0066FF", corTexto: "#FFFFFF" },
  { codigo: "336", ispb: "31872495", nome: "Banco C6 S.A.", nomeReduzido: "C6 Bank", tipo: "digital", cor: "#242424", corTexto: "#FFFFFF" },
  { codigo: "341", ispb: "60701190", nome: "Itaú Unibanco S.A.", nomeReduzido: "Itaú", tipo: "comercial", cor: "#EC7000", corTexto: "#003A70" },
  { codigo: "348", ispb: "33264668", nome: "Banco XP S.A.", nomeReduzido: "XP", tipo: "investimento", cor: "#000000", corTexto: "#FFFFFF" },
  { codigo: "349", ispb: "27214112", nome: "Agiplan Financeira S.A.", nomeReduzido: "Agiplan", tipo: "financeira" },
  { codigo: "352", ispb: "29162769", nome: "Toro Corretora de Títulos e Valores Mobiliários", nomeReduzido: "Toro", tipo: "investimento" },
  { codigo: "356", ispb: "60746948", nome: "Banco Real S.A. (ABN AMRO)", nomeReduzido: "Real", tipo: "comercial" },
  { codigo: "364", ispb: "34265629", nome: "Gerencianet S.A.", nomeReduzido: "EFÍ", tipo: "pagamento", cor: "#00BFA5", corTexto: "#FFFFFF" },
  { codigo: "376", ispb: "33172537", nome: "Banco J.P. Morgan S.A.", nomeReduzido: "JP Morgan", tipo: "investimento" },
  { codigo: "380", ispb: "22896431", nome: "PicPay Servicos S.A.", nomeReduzido: "PicPay", tipo: "digital", cor: "#21C25E", corTexto: "#FFFFFF" },
  { codigo: "389", ispb: "17184037", nome: "Banco Mercantil do Brasil S.A.", nomeReduzido: "Mercantil", tipo: "comercial" },
  { codigo: "394", ispb: "07207996", nome: "Banco Bradesco Financiamentos S.A.", nomeReduzido: "Bradesco Fin.", tipo: "financeira" },
  { codigo: "399", ispb: "01701201", nome: "Kirton Bank S.A.", nomeReduzido: "Kirton", tipo: "comercial" },
  { codigo: "403", ispb: "37880206", nome: "Cora SCD S.A.", nomeReduzido: "Cora", tipo: "digital", cor: "#FE3E6D", corTexto: "#FFFFFF" },
  { codigo: "412", ispb: "15357060", nome: "Banco Capital S.A.", nomeReduzido: "Capital", tipo: "comercial" },
  { codigo: "422", ispb: "58160789", nome: "Banco Safra S.A.", nomeReduzido: "Safra", tipo: "comercial", cor: "#00205B", corTexto: "#FFFFFF" },
  { codigo: "456", ispb: "60498557", nome: "Banco MUFG Brasil S.A.", nomeReduzido: "MUFG", tipo: "comercial" },
  { codigo: "461", ispb: "37715993", nome: "Asaas Gestão Financeira", nomeReduzido: "Asaas", tipo: "digital", cor: "#2A7AE4", corTexto: "#FFFFFF" },
  { codigo: "473", ispb: "33466988", nome: "Banco Caixa Geral Brasil S.A.", nomeReduzido: "Caixa Geral", tipo: "comercial" },
  { codigo: "477", ispb: "33042953", nome: "Citibank N.A.", nomeReduzido: "Citibank", tipo: "comercial" },
  { codigo: "487", ispb: "62331228", nome: "Deutsche Bank S.A. Banco Alemão", nomeReduzido: "Deutsche", tipo: "investimento" },
  { codigo: "600", ispb: "59118133", nome: "Banco Luso Brasileiro S.A.", nomeReduzido: "Luso Brasileiro", tipo: "comercial" },
  { codigo: "604", ispb: "31895683", nome: "Banco Industrial do Brasil S.A.", nomeReduzido: "Industrial", tipo: "comercial" },
  { codigo: "610", ispb: "78626983", nome: "Banco VR S.A.", nomeReduzido: "VR", tipo: "comercial" },
  { codigo: "611", ispb: "61024352", nome: "Banco Paulista S.A.", nomeReduzido: "Paulista", tipo: "comercial" },
  { codigo: "612", ispb: "31880826", nome: "Banco Guanabara S.A.", nomeReduzido: "Guanabara", tipo: "comercial" },
  { codigo: "613", ispb: "60850229", nome: "Omni Banco S.A.", nomeReduzido: "Omni", tipo: "comercial" },
  { codigo: "623", ispb: "59285411", nome: "Banco Pan S.A.", nomeReduzido: "Pan", tipo: "comercial", cor: "#00AEEF", corTexto: "#FFFFFF" },
  { codigo: "626", ispb: "61348538", nome: "Banco C6 Consignado S.A.", nomeReduzido: "C6 Consig.", tipo: "comercial" },
  { codigo: "630", ispb: "58497702", nome: "Banco Smartbank S.A.", nomeReduzido: "Smartbank", tipo: "comercial" },
  { codigo: "633", ispb: "68900810", nome: "Banco Rendimento S.A.", nomeReduzido: "Rendimento", tipo: "comercial" },
  { codigo: "634", ispb: "17351180", nome: "Banco Triângulo S.A.", nomeReduzido: "Triângulo", tipo: "comercial" },
  { codigo: "637", ispb: "60889128", nome: "Banco Sofisa S.A.", nomeReduzido: "Sofisa", tipo: "comercial" },
  { codigo: "643", ispb: "62144175", nome: "Banco Pine S.A.", nomeReduzido: "Pine", tipo: "comercial" },
  { codigo: "652", ispb: "60872504", nome: "Itaú Unibanco Holding S.A.", nomeReduzido: "Itaú Holding", tipo: "comercial" },
  { codigo: "654", ispb: "92874270", nome: "Banco Digimais S.A.", nomeReduzido: "Digimais", tipo: "digital" },
  { codigo: "655", ispb: "59588111", nome: "Banco Votorantim S.A.", nomeReduzido: "Votorantim", tipo: "comercial" },
  { codigo: "707", ispb: "62232889", nome: "Banco Daycoval S.A.", nomeReduzido: "Daycoval", tipo: "comercial" },
  { codigo: "735", ispb: "01023570", nome: "Banco Neon S.A.", nomeReduzido: "Neon", tipo: "digital", cor: "#0066FF", corTexto: "#FFFFFF" },
  { codigo: "739", ispb: "00558456", nome: "Banco Cetelem S.A.", nomeReduzido: "Cetelem", tipo: "financeira" },
  { codigo: "741", ispb: "00517645", nome: "Banco Ribeirão Preto S.A.", nomeReduzido: "Rib. Preto", tipo: "comercial" },
  { codigo: "743", ispb: "00795423", nome: "Banco Semear S.A.", nomeReduzido: "Semear", tipo: "comercial" },
  { codigo: "745", ispb: "33479023", nome: "Banco Citibank S.A.", nomeReduzido: "Citibank", tipo: "comercial", cor: "#003DA5", corTexto: "#FFFFFF" },
  { codigo: "746", ispb: "30723886", nome: "Banco Modal S.A.", nomeReduzido: "Modal", tipo: "investimento" },
  { codigo: "748", ispb: "01181521", nome: "Banco Cooperativo Sicredi S.A.", nomeReduzido: "Sicredi", tipo: "cooperativa", cor: "#00703C", corTexto: "#FFFFFF" },
  { codigo: "752", ispb: "01073966", nome: "Banco BNP Paribas Brasil S.A.", nomeReduzido: "BNP Paribas", tipo: "comercial" },
  { codigo: "753", ispb: "74828799", nome: "Novo Banco Continental S.A.", nomeReduzido: "NBC", tipo: "comercial" },
  { codigo: "756", ispb: "02038232", nome: "Banco Cooperativo do Brasil S.A. - Bancoob", nomeReduzido: "Sicoob", tipo: "cooperativa", cor: "#003641", corTexto: "#FFFFFF" },
  { codigo: "757", ispb: "02318507", nome: "Banco KEB Hana do Brasil S.A.", nomeReduzido: "KEB Hana", tipo: "comercial" },

  // ===== BANCOS DIGITAIS / FINTECHS =====
  { codigo: "197", ispb: "16501555", nome: "Stone Pagamentos S.A.", nomeReduzido: "Stone", tipo: "digital", cor: "#00A868", corTexto: "#FFFFFF" },
  { codigo: "340", ispb: "09554480", nome: "Super Pagamentos S.A. (Superdigital)", nomeReduzido: "Superdigital", tipo: "digital" },
  { codigo: "383", ispb: "21018182", nome: "Juno / Ebanx", nomeReduzido: "Juno", tipo: "pagamento" },
  { codigo: "401", ispb: "13203354", nome: "Iugu Instituição de Pagamento", nomeReduzido: "Iugu", tipo: "pagamento" },
  { codigo: "406", ispb: "37715993", nome: "Accredito SCD S.A.", nomeReduzido: "Accredito", tipo: "digital" },
  { codigo: "411", ispb: "15111975", nome: "Via Certa Financiadora S.A.", nomeReduzido: "Via Certa", tipo: "financeira" },
  { codigo: "329", ispb: "34829992", nome: "QI Sociedade de Crédito Direto S.A.", nomeReduzido: "QI Tech", tipo: "digital", cor: "#6C2BD9", corTexto: "#FFFFFF" },
  { codigo: "343", ispb: "32648370", nome: "FFA Sociedade de Crédito ao Microempreendedor", nomeReduzido: "FFA", tipo: "digital" },
  { codigo: "355", ispb: "34335592", nome: "Ótimo SCD S.A.", nomeReduzido: "Ótimo", tipo: "digital" },
  { codigo: "362", ispb: "13140088", nome: "Cielo S.A.", nomeReduzido: "Cielo", tipo: "pagamento", cor: "#00529B", corTexto: "#FFFFFF" },
  { codigo: "365", ispb: "33863702", nome: "Solidus S.A. CCVM", nomeReduzido: "Solidus", tipo: "investimento" },
  { codigo: "381", ispb: "31749596", nome: "Banco Mercedes-Benz do Brasil S.A.", nomeReduzido: "Mercedes-Benz", tipo: "comercial" },
  { codigo: "382", ispb: "04307598", nome: "Fidúcia SCM Ltda.", nomeReduzido: "Fidúcia", tipo: "digital" },
  { codigo: "384", ispb: "11165756", nome: "Global SCM S.A.", nomeReduzido: "Global SCM", tipo: "digital" },
  { codigo: "387", ispb: "34088029", nome: "Banco Toyota do Brasil S.A.", nomeReduzido: "Toyota", tipo: "comercial" },
  { codigo: "396", ispb: "13884775", nome: "Hub Pagamentos S.A.", nomeReduzido: "HubPag", tipo: "pagamento" },
  { codigo: "404", ispb: "37241230", nome: "Sumup SCD S.A.", nomeReduzido: "SumUp", tipo: "digital", cor: "#1A4CFF", corTexto: "#FFFFFF" },
  { codigo: "407", ispb: "37880206", nome: "InfinitePay (CloudWalk)", nomeReduzido: "InfinitePay", tipo: "digital", cor: "#00C969", corTexto: "#FFFFFF" },
  { codigo: "413", ispb: "40654622", nome: "Banco BV S.A.", nomeReduzido: "BV", tipo: "digital", cor: "#0066CC", corTexto: "#FFFFFF" },
  { codigo: "414", ispb: "39416705", nome: "Work Sociedade de Crédito Direto S.A.", nomeReduzido: "Work SCD", tipo: "digital" },
  { codigo: "418", ispb: "40083667", nome: "Zipdin Soluções Digitais SCD S.A.", nomeReduzido: "Zipdin", tipo: "digital" },
  { codigo: "428", ispb: "42259084", nome: "Credsystem SCD S.A.", nomeReduzido: "Credsystem", tipo: "digital" },
  { codigo: "435", ispb: "42272526", nome: "Delcred SCD S.A.", nomeReduzido: "Delcred", tipo: "digital" },
  { codigo: "450", ispb: "43180355", nome: "Fitbank Pagamentos Eletrônicos S.A.", nomeReduzido: "Fitbank", tipo: "pagamento", cor: "#FF5722", corTexto: "#FFFFFF" },
  { codigo: "452", ispb: "43599047", nome: "Credifit SCD S.A.", nomeReduzido: "Credifit", tipo: "digital" },
  { codigo: "462", ispb: "39669186", nome: "Stark SCD S.A.", nomeReduzido: "Stark Bank", tipo: "digital", cor: "#000000", corTexto: "#7CFC00" },
  { codigo: "463", ispb: "43793355", nome: "Azumi Ltda.", nomeReduzido: "Azumi", tipo: "digital" },
  { codigo: "464", ispb: "43793355", nome: "Banco Sumitomo Mitsui Brasileiro S.A.", nomeReduzido: "SMBC", tipo: "comercial" },
  { codigo: "536", ispb: "18236120", nome: "Navi Pagamentos S.A.", nomeReduzido: "Navi", tipo: "pagamento" },
  { codigo: "707", ispb: "62232889", nome: "Banco Daycoval S.A.", nomeReduzido: "Daycoval", tipo: "comercial" },

  // ===== CARTEIRAS DIGITAIS / PAGAMENTO =====
  { codigo: "516", ispb: "43793355", nome: "Ame Digital Brasil Ltda.", nomeReduzido: "Ame Digital", tipo: "pagamento", cor: "#FF2D78", corTexto: "#FFFFFF" },
  { codigo: "528", ispb: "43793355", nome: "RecargaPay Instituição de Pagamento S.A.", nomeReduzido: "RecargaPay", tipo: "pagamento", cor: "#00B4D8", corTexto: "#FFFFFF" },
  { codigo: "540", ispb: "43793355", nome: "PagSmile Instituição de Pagamento S.A.", nomeReduzido: "PagSmile", tipo: "pagamento", cor: "#FF8C00", corTexto: "#FFFFFF" },
  { codigo: "529", ispb: "43793355", nome: "Getnet S.A.", nomeReduzido: "Getnet", tipo: "pagamento", cor: "#E30613", corTexto: "#FFFFFF" },
  { codigo: "539", ispb: "43793355", nome: "Conta Simples SCD S.A.", nomeReduzido: "Conta Simples", tipo: "digital", cor: "#5046E5", corTexto: "#FFFFFF" },
  { codigo: "542", ispb: "43793355", nome: "Will Financeira S.A.", nomeReduzido: "Will Bank", tipo: "digital", cor: "#FFDD00", corTexto: "#000000" },
  { codigo: "544", ispb: "43793355", nome: "PagTudo Meios de Pagamento S.A.", nomeReduzido: "PagTudo", tipo: "pagamento" },
  { codigo: "546", ispb: "43793355", nome: "Zoop Tecnologia e Meios de Pagamento S.A.", nomeReduzido: "Zoop", tipo: "pagamento", cor: "#6366F1", corTexto: "#FFFFFF" },
  { codigo: "548", ispb: "43793355", nome: "Dock Instituição de Pagamento S.A.", nomeReduzido: "Dock", tipo: "pagamento", cor: "#00D1B2", corTexto: "#FFFFFF" },
  { codigo: "550", ispb: "43793355", nome: "Ewally Instituição de Pagamento S.A.", nomeReduzido: "Ewally", tipo: "pagamento" },
  { codigo: "552", ispb: "43793355", nome: "Levpay Instituição de Pagamento S.A.", nomeReduzido: "LevPay", tipo: "pagamento" },
  { codigo: "554", ispb: "43793355", nome: "Bitz Instituição de Pagamento S.A.", nomeReduzido: "Bitz", tipo: "pagamento", cor: "#00E676", corTexto: "#000000" },

  // ===== BNDES =====
  { codigo: "007", ispb: "33657248", nome: "Banco Nacional de Desenvolvimento Econômico e Social", nomeReduzido: "BNDES", tipo: "desenvolvimento", cor: "#006341", corTexto: "#FFFFFF" },
];

// Buscar banco por código
export function buscarBancoPorCodigo(codigo: string): BancoInfo | undefined {
  return BANCOS_BRASIL.find(b => b.codigo === codigo);
}

// Buscar bancos por nome ou código
export function buscarBancos(termo: string): BancoInfo[] {
  if (!termo) return BANCOS_BRASIL;
  const t = termo.toLowerCase();
  return BANCOS_BRASIL.filter(
    b => b.codigo.includes(t) || b.nome.toLowerCase().includes(t) || b.nomeReduzido.toLowerCase().includes(t)
  );
}

// Agrupar bancos por tipo
export function bancosPorTipo(): Record<string, BancoInfo[]> {
  const grupos: Record<string, BancoInfo[]> = {};
  for (const banco of BANCOS_BRASIL) {
    if (!grupos[banco.tipo]) grupos[banco.tipo] = [];
    grupos[banco.tipo].push(banco);
  }
  return grupos;
}

export const TIPO_LABELS: Record<string, string> = {
  comercial: "Banco Comercial",
  digital: "Banco Digital / Fintech",
  cooperativa: "Cooperativa de Crédito",
  investimento: "Banco de Investimento",
  desenvolvimento: "Banco de Desenvolvimento",
  financeira: "Financeira",
  pagamento: "Instituição de Pagamento",
};
