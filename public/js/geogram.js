$(document).ready(function(){
  
  log('Ready...')
  
  // Global
  window.SUB = {position:null, hasTouch:true}
  
  // Check for touch events (note: this is not exhaustive) and thanks to the Surface
  // and the Chromebook Pixel
  if( !('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch){
    document.documentElement.className = "no-touch"
    SUB.hasTouch = false
  } 

  /* Handle Signup Form ****************************************/
  
  var $connectForm = $('#contact-form')
    , $connectButton = $('#connect-button')

  function strip(html){
     var tmp = document.createElement("div")
     tmp.innerHTML = html
     return tmp.textContent || tmp.innerText
  }
    
  if($connectForm.length){
    
    var connectHandler = function(e){

      $connectButton.attr('disabled', true).addClass('opacity75')
      
      $('.error').removeClass('error')
      
      var $inputEmail = $('input[type="email"]')
        , $inputName = $('input[type="name"]')
        , $inputMessage = $('textarea[name="message"]')
      
      // Sanitize...
      $inputEmail.val( strip( $inputEmail.val() ) ) 
      $inputName.val( strip( $inputName.val() ) ) 
      $inputMessage.val( strip( $inputMessage.val() ) ) 

      // Validate inputs
      if( $inputName.val().length < 2 ){
        log('Bad name.')
        $inputName
          .val('')
          .addClass('error')
          .focus()
        
        $connectButton.removeAttr('disabled').removeClass('opacity75')
          
        return false
        
      } else if( !( /(.+)@(.+){2,}\.(.+){2,}/.test( $inputEmail.val() ) ) ){
        log('Bad email.')
        $inputEmail
          .val('')
          .addClass('error')
          .focus()
        
        $connectButton.removeAttr('disabled').removeClass('opacity75')
        
        return false
      }        
      
      
      $.post('/connect', $connectForm.serialize(), function(resp){
        
        // This is a weird delta between zepto and jquery...
        var r = (typeof resp === 'string') ? JSON.parse(resp) : resp
        
        log(r)
        
        $connectForm.find('input, textarea').val('')
        
        $connectButton.removeAttr('disabled').removeClass('opacity75').blur()
        
        var responseMessageClass = r.error ? "failed-submission" : "successful-submission"
        
        $('#contact-header').find('h3').after('<p class="'+ responseMessageClass +'">'+r.message+'</p>')
        
        setTimeout(function(){
          $('#contact-header').find('p').remove()
        },5000)
        
      }) // end post
      
      return false
      
    }
    
    $connectButton.on('click', function(e){
      connectHandler(e)
      e.preventDefault()
      return false

    }) // end click()
    
    $connectForm.on('submit', function(e){
      connectHandler(e)
      e.preventDefault()
      return false

    }) // end submit()
    
  }

  /* End Signup Form *******************************************/
  
})
