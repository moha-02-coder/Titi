# PROMPT D'ANALYSE ET NETTOYAGE CSS - TITI GOLDEN TASTE

## CONTEXTE
Tu es un expert en optimisation CSS spécialisé dans l'élimination des duplications et la consolidation de feuilles de style pour sites de restauration haut de gamme. Tu travailles sur Titi Golden Taste.

## MISSION CRITIQUE

### 1. ANALYSE DES DUPLICATIONS CSS IDENTIFIÉES

#### **A. Section Contact - Duplications Massives**

**Classes conflictuelles détectées :**

```css
/* ===== DUPLICATION .form-group ===== */
/* style.css (lignes 432-439) */
.contact-form .form-group {
    margin-bottom: 0;
    position: relative;
}

/* order.css (lignes 599-602) */
.form-group {
    display: flex;
    flex-direction: column;
}

/* admin.css (lignes 327-330) */
.form-group {
    display: grid;
    gap: 8px;
}

/* order-enhanced.css (lignes 347-349) */
.form-group {
    margin-bottom: 20px;
}

/* ui-primitives.css (lignes 106-111) */
.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-form-group-gap);
    margin: var(--ui-form-group-margin);
}
```

**Conflit :** 5 définitions différentes avec display, margin, gap contradictoires

---

```css
/* ===== DUPLICATION .contact-form ===== */
/* style.css (lignes 3093-3096) */
.contact-form {
    position: relative;
    z-index: 2;
}

/* order.css (lignes 588-591) */
.contact-form {
    display: grid;
    gap: 20px;
}
```

**Conflit :** Grid vs position relative

---

```css
/* ===== DUPLICATION .info-card ===== */
/* style.css (lignes 148-157) */
.info-card {
    background: rgba(255, 255, 255, 0.9);
    padding: 24px;
    border-radius: 16px;
}

/* style.css (lignes 3204-3210) - DUPLICATION DANS MÊME FICHIER */
.info-card {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(20px);
    border: 1px solid rgba(212, 175, 55, 0.2);
}
```

**Conflit :** Deux définitions complètement différentes dans le même fichier

---

#### **B. Section Order Wizard - Duplications Critiques**

```css
/* ===== DUPLICATION .order-wizard ===== */
/* style.css (lignes 2469-2480) */
.order-wizard {
    max-width: 1200px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(20px);
}

/* order.css (lignes 49-58) */
.order-wizard {
    max-width: 800px;
    background: rgba(255, 255, 255, 0.95);
}

/* order-enhanced.css (lignes 19-27) */
.order-wizard {
    max-width: 900px;
    background: white;
}
```

**Conflit :** 3 largeurs différentes et 3 backgrounds différents

---

```css
/* ===== DUPLICATION .wizard-step ===== */
/* style.css (lignes 2566-2579) */
.wizard-step {
    display: none;
    opacity: 0;
    transform: translateY(20px);
}

/* order.css (lignes 74-77) */
.wizard-step {
    flex: 1;
    text-align: center;
    position: relative;
}

/* order-enhanced.css (lignes 131-138) */
.wizard-step {
    display: none;
    animation: fadeInStep 0.5s ease;
}
```

**Conflit :** Display none vs flex, animations différentes

---

```css
/* ===== DUPLICATION .btn-next/.btn-prev ===== */
/* order.css (lignes 435-461) */
.btn-next {
    background: var(--primary-color);
    color: white;
}

.btn-prev {
    background: var(--light-color);
    color: var(--dark-color);
}

/* order-enhanced.css (lignes 114-119) */
.order-wizard-nav .nav-btn.next {
    background: white;
    color: var(--primary-color);
    border-color: white;
}
```

**Conflit :** Couleurs et backgrounds complètement opposés

---

## 2. STRATÉGIE DE CONSOLIDATION

### **Hiérarchie de Priorité Établie :**
1. **style.css** (principal - frontend) - PRIORITÉ MAXIMALE
2. **order-enhanced.css** (fonctionnalités avancées)
3. **order.css** (styles de base)
4. **customize-order.css** (spécifique customisation)
5. **admin.css** (interface admin)
6. **ui-primitives.css** (composants réutilisables)

### **Plan de Nettoyage :**

#### **Phase 1: Formulaires Contact**
```css
/* Consolidation dans style.css */
.form-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
    position: relative;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

/* Supprimer des autres fichiers */
/* order.css lignes 599-602 */
/* admin.css lignes 327-330 */
/* order-enhanced.css lignes 347-349 */
/* ui-primitives.css lignes 106-111 */
```

#### **Phase 2: Order Wizard**
```css
/* Consolidation dans style.css */
.order-wizard {
    max-width: 1200px;
    margin: 0 auto;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(20px);
    border: 1px solid rgba(212, 175, 55, 0.2);
    border-radius: 24px;
    padding: 40px;
}

/* Supprimer des autres fichiers */
/* order.css lignes 49-58 */
/* order-enhanced.css lignes 19-27 */
```

#### **Phase 3: Boutons Navigation**
```css
/* Consolidation dans style.css */
.btn-next, .btn-prev, .btn-submit {
    padding: 14px 28px;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.btn-prev {
    background: rgba(255, 255, 255, 0.1);
    color: var(--gold);
}

.btn-next {
    background: linear-gradient(135deg, var(--gold), var(--dark-gold));
    color: var(--dark);
}

.btn-next:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
}

.btn-submit {
    background: linear-gradient(135deg, #4ecdc4, #44a3aa);
    color: white;
}
```

## 3. LOGIQUE DE BLOCAGE ÉTAPES

### **JavaScript à implémenter :**
```javascript
class OrderWizardManager {
    constructor() {
        this.currentStep = 1;
        this.selectedMenu = null;
        this.init();
    }

    init() {
        this.setupMenuSelection();
        this.setupNavigation();
        this.updateStepStates();
    }

    setupMenuSelection() {
        const menuCards = document.querySelectorAll('.menu-card');
        menuCards.forEach(card => {
            card.addEventListener('click', () => this.selectMenu(card));
        });
    }

    selectMenu(card) {
        // Désélectionner les autres
        document.querySelectorAll('.menu-card').forEach(c => 
            c.classList.remove('selected'));
        
        // Sélectionner le courant
        card.classList.add('selected');
        this.selectedMenu = card.dataset.menuId;
        
        // Activer l'étape 2
        this.enableStep2();
    }

    enableStep2() {
        const btnNext = document.querySelector('.btn-next');
        const step2Indicator = document.querySelector('[data-step="2"]');
        
        if (btnNext) {
            btnNext.disabled = false;
            btnNext.classList.add('enabled');
        }
        
        if (step2Indicator) {
            step2Indicator.classList.remove('disabled');
            step2Indicator.classList.add('available');
        }
    }

    updateStepStates() {
        const btnNext = document.querySelector('.btn-next');
        if (btnNext && !this.selectedMenu) {
            btnNext.disabled = true;
            btnNext.classList.add('blocked');
        }
    }
}
```

## 4. ACTIONS IMMÉDIATES

### **À SUPPRIMER D'URGENCE :**

1. **style.css lignes 3204-3210** - Duplication .info-card
2. **order.css lignes 599-602** - .form-group redondant
3. **admin.css lignes 327-330** - .form-group conflictuel
4. **order-enhanced.css lignes 19-27** - .order-wizard redondant
5. **order.css lignes 49-58** - .order-wizard conflictuel

### **À CONSOLIDER DANS style.css :**

1. Toutes les définitions .form-group
2. Toutes les définitions .order-wizard
3. Toutes les définitions .btn-next/.btn-prev
4. Toutes les définitions .wizard-step

## 5. VALIDATION POST-NETTOYAGE

### **Tests à effectuer :**
- ✅ Affichage section contact
- ✅ Fonctionnalité formulaire
- ✅ Navigation wizard étapes
- ✅ Blocage/déblocage étape 2
- ✅ Responsive mobile/tablet/desktop
- ✅ Animations et transitions

### **Fichiers à mettre à jour :**
- `assets/css/style.css` (consolidation)
- `assets/css/order.css` (suppression duplications)
- `assets/css/order-enhanced.css` (suppression duplications)
- `assets/css/customize-order.css` (optimisation)
- `assets/js/premium-interactions.js` (logique wizard)

## 6. LIVRABLES

1. **Rapport de nettoyage** avec lignes supprimées
2. **style.css consolidé** et optimisé
3. **Fichiers CSS nettoyés** sans duplications
4. **JavaScript wizard** avec logique de blocage
5. **Documentation** des changements

Commence immédiatement par supprimer les duplications critiques dans style.css, puis procède à la consolidation systématique.
