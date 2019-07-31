import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from './model/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  public conectado: boolean;
  public escribiendo: string;
  public clienteId: string;

  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];

  constructor() {
    this.clienteId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit() {

    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS('http://localhost:8080/chat-websocket');
    };

    this.client.onConnect = (frame) => {
      console.log('Conectado:' + this.client.connected + ':' + frame);
      this.conectado = true;

      this.client.subscribe('/chat/mensaje', response => {
        let mensaje: Mensaje = JSON.parse(response.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);

        if (!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO' &&
          this.mensaje.username == mensaje.username) {
          this.mensaje.color = mensaje.color;
        }
        this.mensajes.push(mensaje);
      });

      this.client.subscribe('/chat/escribiendo', response => {
        this.escribiendo = response.body;
        setTimeout( () => this.escribiendo = '', 3000);
      });

      console.log(this.clienteId);

      this.client.subscribe('/chat/historial/' + this.clienteId, response => {
        const historial = JSON.parse(response.body) as Mensaje[];
        this.mensajes = historial.map(msj => {
          msj.fecha = new Date(msj.fecha);
          return msj;
        }).reverse();
      });

      this.client.publish({destination: '/app/historial', body: this.clienteId});

      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) });

    };

    this.client.onDisconnect = (frame) => {
      console.log('Desconectado:' + !this.client.connected + ':' + frame);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes = [];
    };
  }

  conectar(): void {
    this.client.activate();
  }

  desconectar(): void {
    this.client.deactivate();
  }

  enviarMensaje(): void {
    this.mensaje.tipo = 'MENSAJE';
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje)
    });
    this.mensaje.texto = '';
  }

  escribiendoEvent(): void {
    this.client.publish({destination: '/app/escribiendo', body: this.mensaje.username});
  }



}
