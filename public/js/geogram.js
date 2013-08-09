$(document).ready(function(){
  
  log('Ready...')
  
  // Global
  window.Geogram = {position:null, hasTouch:true}
  
  // Check for touch events (note: this is not exhaustive) and thanks to the Surface
  // and the Chromebook Pixel...
  if( !('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch){
    document.documentElement.className = "no-touch"
    Geogram.hasTouch = false
  } 

  /* Handle Search Form ****************************************/
  
  var $form = $('#search-form')
    , $button = $('#search-button')

  function strip(html){
     var tmp = document.createElement("div")
     tmp.innerHTML = html
     return tmp.textContent || tmp.innerText
  }
    
  if($form.length){

    var searchHandler = function(e){

      $button.attr('disabled', true).addClass('opacity75')
      
      $('.error').removeClass('error')
      
      var $latitude = $('#latitude')
        , $longitude = $('#longitude')
        , $distance = $('#distance')
      
      // Sanitize...
      $latitude.val( strip( $latitude.val() ) ) 
      $longitude.val( strip( $longitude.val() ) ) 
      $distance.val( strip( $distance.val() ) ) 

      // Validate inputs
      if( $longitude.val().length < 2 ){
        log('Bad name.')
        $longitude
          .val('')
          .addClass('error')
          .focus()
        
        $button.removeAttr('disabled').removeClass('opacity75')
          
        return false
        
      }// todo check for numbers        


      $.ajax({
        type: 'POST',
        url: '/search/geo',
        data: $form.serialize(),
        dataType: 'json',
        success: function(data){
          // This is a weird delta between zepto and jquery...
          var r = (typeof data === 'string') ? JSON.parse(data) : data

          log(r)
          
          $button.removeAttr('disabled').removeClass('opacity75').blur()
        },
        error: function(xhr, type){
          // jesus fix this
          if(xhr.status === 403) alert(xhr.responseText)
          if(xhr.status === 404) alert(xhr.responseText)
          if(xhr.status === 500) alert(xhr.responseText)
          $button.removeAttr('disabled').removeClass('opacity75').blur()
        }
      })

      return false
      
    }
    
    $button.on('click', function(e){
      searchHandler(e)
      e.preventDefault()
      return false

    }) // end click()
    
    $form.on('submit', function(e){
      searchHandler(e)
      e.preventDefault()
      return false

    }) // end submit()
    
  }

  /* End Search Form *******************************************/
  
})
