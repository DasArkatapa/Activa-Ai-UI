import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  conversation_id: string;
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private apiUrl = 'http://localhost:8000/chat';

  constructor(private http: HttpClient) {}

  sendMessage(
    conversationId: string,
    message: string
  ): Observable<ChatResponse> {

    const request: ChatRequest = {
      conversation_id: conversationId,
      message: message
    };

    return this.http.post<ChatResponse>(
      this.apiUrl,
      request
    );
  }
}
