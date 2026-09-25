/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LogicQuantifier {
    Forall,
    Exists,
}

#[derive(Debug, Clone)]
pub enum AstNode {
    Predicate {
        name: String,
        args: Vec<String>,
    },
    Implication {
        antecedent: Box<AstNode>,
        consequent: Box<AstNode>,
    },
    Conjunction(Vec<AstNode>),
    Disjunction(Vec<AstNode>),
    Negation(Box<AstNode>),
    Quantified {
        quantifier: LogicQuantifier,
        var_name: String,
        sort: String,
        body: Box<AstNode>,
    },
    Constant(String),
}

pub struct AstToSmtEngine {
    sorts: HashSet<String>,
    predicates: HashSet<(String, usize)>,
    constants: HashSet<(String, String)>,
}

impl AstToSmtEngine {
    pub fn new() -> Self {
        Self {
            sorts: HashSet::new(),
            predicates: HashSet::new(),
            constants: HashSet::new(),
        }
    }

    pub fn register_sort(&mut self, sort_name: &str) {
        self.sorts.insert(sort_name.to_string());
    }

    pub fn register_predicate(&mut self, name: &str, arity: usize) {
        self.predicates.insert((name.to_string(), arity));
    }

    pub fn register_constant(&mut self, name: &str, sort: &str) {
        self.constants.insert((name.to_string(), sort.to_string()));
        self.register_sort(sort);
    }

    /// AST ağacını Z3 SMT-LIB2 formatında metinsel ispat girdisine dönüştürür
    pub fn compile_ast_to_smtlib2(&mut self, premises: &[AstNode], goal: &AstNode) -> String {
        let mut smt = String::new();
        smt.push_str(";; AXIOM™ Z3 First-Order Logic SMT-LIB2 Engine\n");
        smt.push_str("(set-option :produce-proofs true)\n");
        smt.push_str("(set-logic ALL)\n\n");

        // 1. Tür (Sort) Tanımları
        for sort in &self.sorts {
            smt.push_str(&format!("(declare-sort {} 0)\n", sort));
        }

        // 2. Sabit (Constant) Tanımları
        for (const_name, sort) in &self.constants {
            smt.push_str(&format!("(declare-const {} {})\n", const_name, sort));
        }

        // 3. Yüklem (Predicate) Tanımları
        for (pred_name, arity) in &self.predicates {
            let types = vec!["Entity"; *arity].join(" ");
            smt.push_str(&format!("(declare-fun {} ({}) Bool)\n", pred_name, types));
        }

        smt.push_str("\n;; Hipotezler / Öncüller (Premises)\n");
        for premise in premises {
            smt.push_str(&format!("(assert {})\n", self.node_to_smt(premise)));
        }

        smt.push_str("\n;; Hedef İspat Reddi (Negated Goal for Refutation)\n");
        smt.push_str(&format!("(assert (not {}))\n\n", self.node_to_smt(goal)));

        smt.push_str("(check-sat)\n");
        smt.push_str("(get-proof)\n");

        smt
    }

    fn node_to_smt(&mut self, node: &AstNode) -> String {
        match node {
            AstNode::Predicate { name, args } => {
                self.register_predicate(name, args.len());
                if args.is_empty() {
                    name.clone()
                } else {
                    format!("({} {})", name, args.join(" "))
                }
            }
            AstNode::Implication { antecedent, consequent } => {
                format!(
                    "(=> {} {})",
                    self.node_to_smt(antecedent),
                    self.node_to_smt(consequent)
                )
            }
            AstNode::Conjunction(nodes) => {
                let inner = nodes
                    .iter()
                    .map(|n| self.node_to_smt(n))
                    .collect::<Vec<_>>()
                    .join(" ");
                format!("(and {})", inner)
            }
            AstNode::Disjunction(nodes) => {
                let inner = nodes
                    .iter()
                    .map(|n| self.node_to_smt(n))
                    .collect::<Vec<_>>()
                    .join(" ");
                format!("(or {})", inner)
            }
            AstNode::Negation(inner) => {
                format!("(not {})", self.node_to_smt(inner))
            }
            AstNode::Quantified {
                quantifier,
                var_name,
                sort,
                body,
            } => {
                self.register_sort(sort);
                let q_str = match quantifier {
                    LogicQuantifier::Forall => "forall",
                    LogicQuantifier::Exists => "exists",
                };
                format!(
                    "({} (({} {})) {})",
                    q_str,
                    var_name,
                    sort,
                    self.node_to_smt(body)
                )
            }
            AstNode::Constant(name) => name.clone(),
        }
    }
}
