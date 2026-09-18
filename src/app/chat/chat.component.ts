import { Component, NgZone } from '@angular/core';
import { ChatService, ChatResponse } from '../chat.service';
import { finalize } from 'rxjs/operators';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {

  // ==============================
  // Chat properties
  // ==============================

  userMessage: string = '';

  conversationId: string = 'active-ai-001';

  messages: ChatMessage[] = [];

  isLoading: boolean = false;


  // ==============================
  // Voice properties
  // ==============================

  isListening: boolean = false;

  recognition: any;


  constructor(
    private chatService: ChatService,
    private ngZone: NgZone
  ) {}


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  sendMessage(): void {

    // Do not send empty message
    if (!this.userMessage.trim()) {
      return;
    }

    // Do not allow another request while loading
    if (this.isLoading) {
      return;
    }

    const message = this.userMessage.trim();

    console.log('====================================');
    console.log('Sending message:', message);
    console.log('Conversation ID:', this.conversationId);
    console.log('====================================');


    // ------------------------------------------------------------
    // Add user message to UI
    // ------------------------------------------------------------

    this.messages.push({
      role: 'user',
      content: message
    });


    // Clear input
    this.userMessage = '';


    // Show Thinking...
    this.isLoading = true;


    // ------------------------------------------------------------
    // Call FastAPI
    // ------------------------------------------------------------

    this.chatService
      .sendMessage(
        this.conversationId,
        message
      )
      .pipe(

        finalize(() => {

          console.log('API request completed.');

          /*
           * Because voice recognition can start the request
           * outside Angular's zone, explicitly bring the UI
           * update back into Angular.
           */

          this.ngZone.run(() => {

            this.isLoading = false;

            console.log(
              'Loading state:',
              this.isLoading
            );

          });

        })

      )
      .subscribe({

        // ========================================================
        // SUCCESS
        // ========================================================

        next: (response: ChatResponse) => {

          console.log('====================================');
          console.log('FastAPI response received:');
          console.log(response);
          console.log('AI response:', response.response);
          console.log('====================================');


          /*
           * Make sure Angular knows that the response
           * needs to update the UI.
           */

          this.ngZone.run(() => {

            if (
              response &&
              response.response
            ) {

              this.messages.push({
                role: 'assistant',
                content: response.response
              });

            }
            else {

              this.messages.push({
                role: 'assistant',
                content: 'The AI returned an empty response.'
              });

            }

          });

        },


        // ========================================================
        // ERROR
        // ========================================================

        error: (error) => {

          console.error('====================================');
          console.error('FastAPI error:');
          console.error(error);
          console.error('====================================');


          this.ngZone.run(() => {

            this.messages.push({
              role: 'assistant',
              content:
                'Sorry, something went wrong while processing your request.'
            });

          });

        }

      });

  }


  // ============================================================
  // START VOICE INPUT
  // ============================================================

  startVoiceInput(): void {

    console.log('Starting voice input...');


    // ------------------------------------------------------------
    // Check browser support
    // ------------------------------------------------------------

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;


    if (!SpeechRecognition) {

      alert(
        'Speech recognition is not supported in this browser.'
      );

      return;
    }


    // ------------------------------------------------------------
    // Prevent duplicate recognition
    // ------------------------------------------------------------

    if (this.isListening) {

      console.log(
        'Voice recognition is already running.'
      );

      return;
    }


    // ------------------------------------------------------------
    // Create recognition object
    // ------------------------------------------------------------

    this.recognition =
      new SpeechRecognition();


    // ------------------------------------------------------------
    // Recognition configuration
    // ------------------------------------------------------------

    this.recognition.lang = 'en-US';

    this.recognition.continuous = false;

    this.recognition.interimResults = false;


    // ------------------------------------------------------------
    // Start listening
    // ------------------------------------------------------------

    this.isListening = true;

    console.log('🎤 Listening...');


    try {

      this.recognition.start();

    }
    catch (error) {

      console.error(
        'Unable to start speech recognition:',
        error
      );

      this.isListening = false;

      return;
    }


    // ============================================================
    // SPEECH RESULT
    // ============================================================

    this.recognition.onresult = (event: any) => {

      console.log(
        'Speech recognition result received.'
      );


      const transcript =
        event.results[0][0].transcript;


      console.log(
        '🎤 Voice input:',
        transcript
      );


      /*
       * IMPORTANT:
       *
       * SpeechRecognition runs outside Angular.
       *
       * Therefore we use ngZone.run() so Angular
       * detects the changes to userMessage and UI state.
       */

      this.ngZone.run(() => {

        // Put recognized speech into input
        this.userMessage = transcript;

        // Stop listening indicator
        this.isListening = false;


        console.log(
          'Transcript inside Angular:',
          this.userMessage
        );


        // Automatically send message
        this.sendMessage();

      });

    };


    // ============================================================
    // SPEECH ERROR
    // ============================================================

    this.recognition.onerror = (event: any) => {

      console.error(
        '🎤 Speech recognition error:',
        event.error
      );


      this.ngZone.run(() => {

        this.isListening = false;


        if (event.error === 'not-allowed') {

          alert(
            'Microphone permission was denied. Please allow microphone access in Chrome.'
          );

        }
        else if (event.error === 'no-speech') {

          console.log(
            'No speech was detected.'
          );

        }
        else {

          console.log(
            'Speech recognition error:',
            event.error
          );

        }

      });

    };


    // ============================================================
    // SPEECH END
    // ============================================================

    this.recognition.onend = () => {

      console.log(
        '🎤 Speech recognition ended.'
      );


      this.ngZone.run(() => {

        this.isListening = false;

      });

    };

  }


  // ============================================================
  // STOP VOICE INPUT
  // ============================================================

  stopVoiceInput(): void {

    if (
      this.recognition &&
      this.isListening
    ) {

      console.log(
        'Stopping voice recognition...'
      );


      this.recognition.stop();

      this.isListening = false;

    }

  }

}
