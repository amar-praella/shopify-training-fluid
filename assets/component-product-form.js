/**
 * Product Form Components
 * @variable "window.globalVariables.product.currentVariant" get current variant Data
 */


class ProductForm extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector('form');
    this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
    this.cartElement = document.querySelector('ajax-cart');

    this.pricePerItemEle = this.querySelector('[data-pricePerItem');
    this.price_breaks = this.querySelector('[data-priceBrakJson');
    if (this.price_breaks) this.price_breaks =  JSON.parse(this.price_breaks.textContent);

    this.qtyInput = this.querySelector('[data-qty-container] [data-qty-input]');
    this.qtyBtns = this.querySelectorAll('[data-qty-btn]');
    this.qtyBtns.forEach(qtyBtn => qtyBtn.addEventListener('click', this.manageQtyBtn.bind(this)));

    this.setPriceBreakQnt();
  }

  /**
   * Product Form Submit event
   *
   * @param {evt} Event instance
   */
  onSubmitHandler(evt) {
    evt.preventDefault();
    const addItems = [];
    const submitButton = this.querySelector('[type="submit"]');
    const qtyInput = this.querySelector('[data-qty-input]');
    const pdpContainer = this.closest('.product-details-wrapper');

    submitButton.setAttribute('disabled', true);
    submitButton.classList.add('loading');

    addItems.push(JSON.parse(serializeForm(this.form)))
    if(pdpContainer){
      let addOnItemsEle = pdpContainer.querySelectorAll('[data-addon-selection]:checked');
      addOnItemsEle.forEach((addOn)=>{
        if(!addOn.disabled){
          let addOnParent = addOn.closest('addons-form');
          let addOnJSON = {
            id: addOnParent.querySelector('.variant--id').value,
            quantity: addOnParent.querySelector('.product-quantity').value
          }
          addItems.push(addOnJSON);
        }
      });
    }

    const body = JSON.stringify({
      items: addItems
    });
    
    fetch(`${routes.cart_add_url}`, { ...fetchConfig(), body })
      .then((response) => response.json())
      .then(() => {
        if(document.querySelector('#PopupModal-quickshop')){
          document.querySelector('#PopupModal-quickshop .close-quickshop').dispatchEvent(new Event('click'))
        }
        this.cartElement.getCartData('open_drawer');
        if(qtyInput) qtyInput.value = 1;
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        submitButton.classList.remove('loading');
        submitButton.removeAttribute('disabled');
      });
  }

  /**
   * Product Form Quantity Input update action
   *
   * @param {event} Event instance
   * @event "variant:changed" execute when variant is changed
   */
  manageQtyBtn(event) {
    event.preventDefault();
    let currentVariant = window.globalVariables.product.currentVariant;
    let qntInc = currentVariant?.quantity_rule?.increment ? currentVariant.quantity_rule.increment : 1;
    let qntMax = currentVariant?.quantity_rule?.max;
    let qntMin = currentVariant?.quantity_rule?.min ? currentVariant.quantity_rule.min : 1;

    let currentTarget = event.currentTarget;
    let action = currentTarget.dataset.for || 'increase';
    let $qtyInput = currentTarget.closest('[data-qty-container]').querySelector('[data-qty-input]');
    let currentQty = parseInt($qtyInput.value) || 1;

    let finalQty = qntMin ? qntMin : 1;

    let decreaseQtyBtn = currentTarget.closest('[data-qty-container]').querySelector('[data-for="decrease"]');
    let increaseQtyBtn = currentTarget.closest('[data-qty-container]').querySelector('[data-for="increase"]');

    if(action == 'decrease' && currentQty <= qntMin){
      if(decreaseQtyBtn) decreaseQtyBtn.classList.add('disabled');
      return false;
    }else if(action == 'decrease'){
      finalQty = currentQty - qntInc;
      finalQty == qntMin ? decreaseQtyBtn.classList.add('disabled') : decreaseQtyBtn.classList.remove('disabled');
    } else {
      if(decreaseQtyBtn) decreaseQtyBtn.classList.remove('disabled');
      finalQty = currentQty + qntInc;
    }

    $qtyInput.value = finalQty;
    if(finalQty == qntMax) increaseQtyBtn.classList.add('disabled') 
    else increaseQtyBtn.classList.remove('disabled');

    if(this.price_breaks) {
      let currPriceBreak = this.price_breaks[currentVariant.id];
      if (currPriceBreak) {
        let qntPrice = currPriceBreak.toReversed().filter(data => {
          return finalQty >= data.minimum_quantity;
        }); 
        let breakPrice; 
        if (qntPrice.length > 0) {
          breakPrice = Shopify.formatMoney(qntPrice[0].price, window.globalVariables.money_format);
        } else {
          breakPrice = Shopify.formatMoney(currentVariant.price, window.globalVariables.money_format);
        }

        this.pricePerItemEle.innerHTML = `${window.variantStrings.at} ${breakPrice}`;
      } else {
        this.pricePerItemEle.innerHTML = `${window.variantStrings.at} ${Shopify.formatMoney(currentVariant.price, window.globalVariables.money_format)}`;
      }
    }
  }

  /**
    * Handle volume Quantity in variant change
    * Handle price per itme next to quantity selector
  */
  setPriceBreakQnt() {
    document.addEventListener('variant:changed', (e) => {
      let minQnt = e.detail.quantity_rule.min ? e.detail.quantity_rule.min : 1;
      if (parseInt(this.qtyInput.value) != e.detail.quantity_rule.min) this.qtyInput.value = minQnt;
      this.qtyBtns.forEach(btn => {
        if(btn.dataset.for == "increase") btn.classList.remove('disabled');
      })

      this.pricePerItemEle.innerHTML = `${window.variantStrings.at} ${Shopify.formatMoney(e.detail.price, window.globalVariables.money_format)}`;

      if (this.price_breaks) {
        this.renderPriceVolume(e.detail.id);
      }
    })
  }

  /*
    * Product price volume listing
  */
  renderPriceVolume(variantId) {
    let priceBreaks = this.price_breaks[variantId];
    let priceVolume = this.querySelector('[data-priceVolume');
    let html = ``;
    if (priceBreaks) {
      priceBreaks.forEach(data => {
        html+= `<li>
                  <span>${data.minimum_quantity}+</span>
                  <span>${Shopify.formatMoney(data.price, window.globalVariables.money_format)}</span>
                </li>`;
      });
      priceVolume.querySelector('ul').innerHTML = html;
      priceVolume.style.display = '';
      this.pricePerItemEle.style.display = '';
    } else {
      priceVolume.style.display = 'none';
    }
  }

}
customElements.define('product-form', ProductForm);

/**
 * Dropdown selection for options
 */
class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.form = this.closest('form') || this.closest('.form-element');
    this.formType = this.form.dataset.format;
    this.addBtn = this.form.querySelector('[name="add"]');
    this.variant_json = this.form.querySelector('[data-variantJSON]');
    this.variantPicker = this.dataset.type;

    if(this.formType == 'product-page') this.onVariantChange('load');
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  /**
   * Trigger this function variant is changed
   * @param {event} _event 
   */
  onVariantChange(_event) {
    this.setCurrentVariant();
    if(this.formType == 'product-page') window.globalVariables.product.currentVariant = this.currentVariant;

    if (!this.currentVariant) {
      this.toggleAddButton('disable');
      // Variant name update
      let options = this.form.querySelectorAll('[data-optionindex]');
      options.forEach(option => {
        let lableID = 'option'+option.dataset.optionindex;
        const selectedValue = option.querySelector('input[type="radio"]:checked');
        const lable = option.querySelector('.selected-option');
        if(!lable || !lableID || !selectedValue) return;
        lable.innerHTML = selectedValue.value;
      });
    } else {
      if(this.formType == 'grid'){
        const productGrid = this.closest('[data-product-grid]');
        this.renderProductInfo(this.currentVariant, productGrid);
        this._updateLinks(productGrid); 
      }else{
        const productPage = this.closest('[data-product-container]');
        this.renderProductInfo(this.currentVariant, productPage);
      }
      this.updateURLandID(this.currentVariant);
      this.toggleAddButton('enable');
    }
  }

  /**
   * Change product variant url link in product card when variant is being updated
   * @param {element} productGrid 
   */
  _updateLinks(productGrid){
    if(!this.currentVariant || !productGrid) return;
    const variantURL = '?variant=' + this.currentVariant.id;
    const formLinks = productGrid.querySelectorAll('.product-link');
    formLinks.forEach(link => {
      let href = link.href.split('?')[0];
      link.href = href + variantURL;
    });
  }

  /**
   * Fetch selected options from dropdown
   */
  _getOptionsFromSelect() {
    let options = [];
    this.querySelectorAll('.variant_selector').forEach((selector)=>{
      options.push(selector.value);
    });
    return options;
  }

  /**
   * Fetch selected options from radio
   */
  _getOptionsFromRadio() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset:not(.addon-fieldset)'));
    return fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input:not(.addon-swatch)')).find((radio) => radio.checked).value;
    });
  }

  /**
   * change value of currentVariant when variant being changed 
   */
  setCurrentVariant() {
    // get all current values from selectors
    this.currentVariant = false;
    let options = (this.variantPicker == 'variant-select') ? this._getOptionsFromSelect() : this._getOptionsFromRadio();

    let variantsArray = this._getVariantData();
    variantsArray.find((variant) => {
      // get true or false based on options value presented in variant
      // value format would be [true/false,true/fasle,true/false] boolean value based on options present or not
      let mappedValues = variant.options.map((option, index) => {
        return options[index] === option;
      });

      // assign variant details to this.currentVariant if all options are present
      if(!mappedValues.includes(false)){
        this.currentVariant = variant;
        document.dispatchEvent(new CustomEvent('variant:changed',{detail: variant})); 
      }
    });
  }

  /**
   * Update URL on variant change event
   * @param {JSON} currentVariant 
   */
  updateURLandID(currentVariant) {
    if (!currentVariant) return;

    // update query string with latest variant ID
    if(this.formType == 'product-page') window.history.replaceState({ }, '', `${this.dataset.url}?variant=${currentVariant.id}`);

    // update variant input with currentVariant Id
    const input = this.form.querySelector('input[name="id"]');
    input.value = currentVariant.id;
  }

  /**
   * Render Product data based on current variant
   * @param {event} currentVariant 
   * @param {element} container 
   */
  renderProductInfo(currentVariant, container) {
    if(!currentVariant || !container) return;

    // Price Update
    let price_breaks = this.closest('product-form').querySelector('[data-priceBrakJson');
    if (price_breaks) price_breaks =  JSON.parse(price_breaks.textContent);
    let price = Shopify.formatMoney(currentVariant.price, window.globalVariables.money_format);
    let compare_price = Shopify.formatMoney(currentVariant.compare_at_price, window.globalVariables.money_format);
    let priceElement = container.querySelector('[data-currentPrice]');
    let comparePriceElement = container.querySelector('[data-comparePrice]');
    if (!price_breaks){
      if(priceElement) priceElement.innerHTML = price;
      if(comparePriceElement) {
        comparePriceElement.innerHTML = compare_price;
        if(currentVariant.compare_at_price <= 0){
          comparePriceElement.style.display = 'none';
        }else{
          comparePriceElement.style.display = 'block';
        }
      }
    }

   
    // Grid Image Update on variant selection
    if(this.formType == 'grid'){
      if(!currentVariant.featured_image) return;
      const featuredImage = container.querySelector('[data-feauredImage]');
      let updatedSrc = currentVariant.featured_image.src;
      if(updatedSrc){
        featuredImage.src = updatedSrc;
        featuredImage.srcset = updatedSrc;
      }
    }else{
      if(!currentVariant.featured_image) return;
      let imageID = currentVariant.featured_media.id;
      let imageSlide = document.querySelector(`.product--media[data-mediaID="${imageID}"]`);
      if(this.formType == 'quickshop'){
        imageSlide = document.querySelector(`.quickshop-slider .product--media[data-mediaID="${imageID}"]`);
      }
      if(!imageSlide) return;
      let slideIndex = Array.from(imageSlide.parentNode.children).indexOf(imageSlide);
      if(quickShopSlider) quickShopSlider.slideTo(slideIndex, 2000, true);
      else if(productSlider)  productSlider.slideTo(slideIndex, 2000, true);
    }

    // Variant name update
    let options = this.form.querySelectorAll('[data-optionindex]');
    options.forEach(option => {
      let lableID = 'option'+option.dataset.optionindex;
      const lable = option.querySelector('.selected-option');
      if(!lable || !lableID) return;
      lable.innerHTML = currentVariant[lableID];
    });
  }

  /**
   * Toggle the button based on product availability ( add to cart / soldOut )
   * @param {*} status enable / disable
   */
  toggleAddButton(status) {
    if (!this.addBtn) return;

    if (status == 'disable') {
      this.addBtn.setAttribute('disabled', true);
      if(this.addBtn.querySelector('.add-text'))
        this.addBtn.querySelector('.add-text').textContent = window.variantStrings.unavailable;
    } else if(this.currentVariant && !this.currentVariant.available) {
      this.addBtn.setAttribute('disabled', true);
      if(this.addBtn.querySelector('.add-text'))
        this.addBtn.querySelector('.add-text').textContent = window.variantStrings.soldOut;
    } else {
      this.addBtn.removeAttribute('disabled');
      if(this.form.classList.contains('cart-upsell-form')){
        this.addBtn.querySelector('.add-text').textContent = window.variantStrings.upsellAddText;
      }else{
        this.addBtn.querySelector('.add-text').textContent = window.variantStrings.addToCart;
      }
    }
  }

  /**
   * Store the all the variants json
   */
  _getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.variant_json.textContent);
    return this.variantData;
  }
}
  
  customElements.define('variant-selects', VariantSelects);
  
  /**
   * Radio Button swatch
   */
  class VariantRadios extends VariantSelects {
    constructor() {
      super();

      this.form = this.closest('form') || this.querySelector('.form-element');
      this.formType = this.form.dataset.format;
      
      const colorSwatchContainer = this.querySelector('.color-swatch');
      if(colorSwatchContainer){
        const colorSwatches = colorSwatchContainer.querySelectorAll('.swatch');
        colorSwatches.forEach(swatch => {
          let colorHandle = swatch.querySelector('input[type="radio"]').dataset.handle;
          let swatchStyle = Utility.getSwatchStyle(colorHandle);
          swatch.querySelector('.swatch-label').setAttribute('style', swatchStyle);
        });
      }
    }
  }
  customElements.define('variant-radios', VariantRadios);