export type Formula = {
  id: string;
  name: string;
  formula: string;
  explanation: string[];
  example: string;
};

export type FormulaCategory = {
  id: string;
  name: string;
  emoji: string;
  formulas: Formula[];
};

export const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    id: "geometria",
    name: "Geometria",
    emoji: "📐",
    formulas: [
      {
        id: "area-triangulo",
        name: "Área do Triângulo",
        formula: "A = (b × h) ÷ 2",
        explanation: [
          "b representa a base do triângulo.",
          "h representa a altura.",
          "Multiplica-se a base pela altura e divide-se por dois.",
        ],
        example: "Se a base é 10 e a altura é 6:\nA = (10 × 6) ÷ 2 = 30",
      },
      {
        id: "area-trapezio",
        name: "Área do Trapézio",
        formula: "A = [(B + b) × h] ÷ 2",
        explanation: ["B é a base maior.", "b é a base menor.", "h é a altura."],
        example: "B = 12, b = 8, h = 5\nA = [(12 + 8) × 5] ÷ 2 = 50",
      },
      {
        id: "area-paralelogramo",
        name: "Área do Paralelogramo",
        formula: "A = b × h",
        explanation: ["b é a base.", "h é a altura."],
        example: "Base = 9 e altura = 4\nA = 9 × 4 = 36",
      },
      {
        id: "area-circulo",
        name: "Área do Círculo",
        formula: "A = π × r²",
        explanation: ["r é o raio do círculo.", "π (pi) vale aproximadamente 3,1416."],
        example: "Raio = 7\nA = π × 7² = π × 49 ≈ 153,94",
      },
      {
        id: "perimetro-circulo",
        name: "Perímetro do Círculo",
        formula: "P = 2 × π × r",
        explanation: ["r é o raio do círculo."],
        example: "Raio = 5\nP = 2 × π × 5 ≈ 31,42",
      },
      {
        id: "volume-cilindro",
        name: "Volume do Cilindro",
        formula: "V = π × r² × h",
        explanation: ["r é o raio da base.", "h é a altura do cilindro."],
        example: "r = 3 e h = 10\nV = π × 9 × 10 ≈ 282,74",
      },
    ],
  },
  {
    id: "algebra",
    name: "Álgebra",
    emoji: "➗",
    formulas: [
      {
        id: "bhaskara",
        name: "Equação do 2.º Grau (Bhaskara)",
        formula: "x = (−b ± √Δ) ÷ (2a), com Δ = b² − 4ac",
        explanation: [
          "a, b e c são os coeficientes de ax² + bx + c = 0.",
          "Δ (delta) indica quantas soluções existem: Δ > 0 duas, Δ = 0 uma, Δ < 0 nenhuma real.",
        ],
        example: "x² − 5x + 6 = 0\nΔ = 25 − 24 = 1 → x = (5 ± 1) ÷ 2 → x = 3 ou x = 2",
      },
      {
        id: "produtos-notaveis",
        name: "Produtos Notáveis",
        formula: "(a + b)² = a² + 2ab + b²",
        explanation: ["Quadrado do primeiro, mais o dobro do produto, mais o quadrado do segundo."],
        example: "(x + 3)² = x² + 6x + 9",
      },
      {
        id: "regra-tres",
        name: "Regra de Três Simples",
        formula: "a ÷ b = c ÷ x  →  x = (b × c) ÷ a",
        explanation: ["Usada quando duas grandezas são diretamente proporcionais."],
        example: "Se 4 cadernos custam 200 MT, 7 cadernos custam:\nx = (200 × 7) ÷ 4 = 350 MT",
      },
    ],
  },
  {
    id: "estatistica",
    name: "Estatística",
    emoji: "📊",
    formulas: [
      {
        id: "media",
        name: "Média Aritmética",
        formula: "x̄ = (soma dos valores) ÷ (número de valores)",
        explanation: ["Somam-se todos os valores e divide-se pela quantidade deles."],
        example: "Notas 12, 14, 16, 18\nx̄ = 60 ÷ 4 = 15",
      },
      {
        id: "variancia",
        name: "Variância",
        formula: "σ² = Σ(xᵢ − x̄)² ÷ n",
        explanation: ["Mede o quanto os valores se afastam da média."],
        example: "Valores 2, 4, 6 (x̄ = 4)\nσ² = (4 + 0 + 4) ÷ 3 ≈ 2,67",
      },
      {
        id: "desvio",
        name: "Desvio Padrão",
        formula: "σ = √(variância)",
        explanation: ["É a raiz quadrada da variância, na mesma unidade dos dados."],
        example: "Se σ² = 2,67 então σ ≈ 1,63",
      },
    ],
  },
  {
    id: "contabilidade",
    name: "Contabilidade",
    emoji: "🧾",
    formulas: [
      {
        id: "equacao-patrimonial",
        name: "Equação Patrimonial",
        formula: "Activo = Passivo + Capital Próprio",
        explanation: ["Tudo o que a empresa possui é financiado por dívidas ou por capital próprio."],
        example: "Activo 500.000 MT e Passivo 200.000 MT\nCapital Próprio = 300.000 MT",
      },
      {
        id: "resultado-liquido",
        name: "Resultado Líquido",
        formula: "Resultado = Proveitos − Custos",
        explanation: ["Se o resultado for positivo há lucro; se for negativo há prejuízo."],
        example: "Proveitos 80.000 MT e Custos 55.000 MT\nResultado = 25.000 MT de lucro",
      },
    ],
  },
  {
    id: "gestao",
    name: "Gestão",
    emoji: "💼",
    formulas: [
      {
        id: "ponto-critico",
        name: "Ponto Crítico de Vendas",
        formula: "PC = Custos Fixos ÷ (Preço − Custo Variável)",
        explanation: ["Indica quantas unidades é preciso vender para não ter prejuízo."],
        example: "Custos fixos 30.000 MT, preço 100 MT, custo variável 40 MT\nPC = 30.000 ÷ 60 = 500 unidades",
      },
      {
        id: "margem",
        name: "Margem de Lucro",
        formula: "Margem (%) = (Lucro ÷ Vendas) × 100",
        explanation: ["Mostra quanto de cada 100 MT vendidos fica como lucro."],
        example: "Lucro 15.000 MT e vendas 60.000 MT\nMargem = 25%",
      },
    ],
  },
  {
    id: "economia",
    name: "Economia",
    emoji: "📈",
    formulas: [
      {
        id: "pib",
        name: "PIB pela Despesa",
        formula: "PIB = C + I + G + (X − M)",
        explanation: [
          "C é o consumo das famílias, I o investimento, G os gastos do Estado.",
          "X são as exportações e M as importações.",
        ],
        example: "C=500, I=200, G=150, X=100, M=80\nPIB = 870",
      },
      {
        id: "inflacao",
        name: "Taxa de Inflação",
        formula: "π = [(IPC₁ − IPC₀) ÷ IPC₀] × 100",
        explanation: ["Compara o índice de preços de dois períodos."],
        example: "IPC₀ = 120 e IPC₁ = 132\nπ = (12 ÷ 120) × 100 = 10%",
      },
    ],
  },
  {
    id: "programacao",
    name: "Programação",
    emoji: "💻",
    formulas: [
      {
        id: "complexidade",
        name: "Complexidade de Algoritmos",
        formula: "O(n), O(log n), O(n²)",
        explanation: [
          "O(n) cresce em proporção ao número de dados.",
          "O(log n) cresce muito devagar (pesquisa binária).",
          "O(n²) cresce rapidamente (ciclos encaixados).",
        ],
        example: "Percorrer uma lista de 1000 elementos com dois ciclos encaixados → 1.000.000 operações.",
      },
      {
        id: "conversao-binaria",
        name: "Conversão Decimal → Binário",
        formula: "Divisões sucessivas por 2, lendo os restos de baixo para cima",
        explanation: ["Divide-se o número por 2 até chegar a zero e junta-se os restos ao contrário."],
        example: "13 → 1101",
      },
    ],
  },
];

export function findFormula(id: string) {
  for (const cat of FORMULA_CATEGORIES) {
    const f = cat.formulas.find((x) => x.id === id);
    if (f) return { category: cat, formula: f };
  }
  return null;
}
