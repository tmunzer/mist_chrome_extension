import { Component, OnInit, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AccountManageComponent } from './manage/manage.component';
import { Subject } from 'rxjs';

export interface OrgElement {
  org_id: string;
  name: string;
}

export interface SessionElement {
  domain: string;
  csrftoken: string;
  email: string;
  has_sessionid: boolean;
  expires_at: number;
  orgs: OrgElement[];
}

@Component({
  selector: 'app-account',
  templateUrl: 'account.component.html',
  styleUrls: ['account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountComponent implements OnInit {

  @ViewChild(AccountManageComponent) accountManage;
  enventSession: Subject<SessionElement> = new Subject<SessionElement>()
  enventCreateToken: Subject<boolean> = new Subject<boolean>()
  enventManageTokens: Subject<boolean> = new Subject<boolean>()

  mistcom: string = "";
  eumistcom: string = "";
  gc1mistcom: string = "";

  manageTokens: string = "";
  createToken: string = "";
  scope: string = "";
  constructor(
    private _cd: ChangeDetectorRef,
    private _http: HttpClient
  ) { }

  domains = [
    "mistsys.com",
    ".mist.com",
    ".eu.mist.com",
    ".gc1.mist.com"
  ]

  sessions: SessionElement[] = [];
  is_working = true;

  ngOnInit() {
    this.is_working = true;
    this.sessions = [];
    chrome.cookies.getAll({}, (cookies) => {
      cookies.forEach((cookie) => {
        this.processCookie(cookie);
      })
      this.getSelf();
    })
  }

  ////////////
  // SESSIONS
  ////////////
  processCookie(cookie: chrome.cookies.Cookie): void {
    // check if it's part of our domains
    if (this.domains.indexOf(cookie.domain) > -1) {
      // check if the cookie is still valid
      if (cookie.expirationDate > (Date.now() / 1000)) {
        let i: number = -1;
        // try to find this domain in the list of sessions
        this.sessions.forEach((session, index) => {
          if (session.domain == cookie.domain) {
            i = index;
          }
        })
        // if the session already exists in the list, update it with the current cookie
        if (i > -1) {
          if (cookie.name.startsWith("csrftoken")) this.sessions[i].csrftoken = cookie.value;
          else if (cookie.name.startsWith("sessionid")) this.sessions[i].has_sessionid = true;
          // if the current cookie has a shorter lifetime than the previous one, use its expirationDate instead
          if (this.sessions[i].expires_at > cookie.expirationDate) this.sessions[i].expires_at = cookie.expirationDate
          // otherwise, add a new entry in the list
        } else {
          if (cookie.name.startsWith("csrftoken")) this.sessions.push({ domain: cookie.domain, email: null, csrftoken: cookie.value, has_sessionid: false, expires_at: cookie.expirationDate, orgs: [] });
          else if (cookie.name.startsWith("sessionid")) this.sessions.push({ domain: cookie.domain, email: null, csrftoken: null, has_sessionid: true, expires_at: cookie.expirationDate, orgs: [] });
        }
      }
    }
  }

  getSelf() {
    this.sessions.forEach(session => {
      if (session.has_sessionid && session.csrftoken) {
        let url = "https://api" + session.domain + "/api/v1/self"
        this._http.get(url).subscribe((data) => {
          session.email = data["email"];
          session.orgs = this.processOrgs(data["privileges"]);
          this._cd.detectChanges()
        })
      }
    })
    this.is_working = false;
  }

  processOrgs(privileges: any[]): OrgElement[] {
    let orgs: OrgElement[] = [];
    privileges.forEach(privilege => {
      if (["admin", "write"].indexOf(privilege["role"]) > -1) {
        if (privilege["scope"] == "org") {
          orgs.push({ org_id: privilege["org_id"], name: privilege["name"] });
        }
      }
    })

    orgs.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1
      else if (a.name.toLowerCase() < b.name.toLowerCase()) return -1
      else return 0
    });;

    return orgs;
  }


  openTab(domain: string) {
    let dest_url = "https://manage" + domain + "/cloud.html";
    chrome.tabs.create({ url: dest_url });
  }


  ////////////
  // MANAGE TOKENS
  ////////////
  openManageTokens(domain: string, scope: string): void {
    this.manageTokens = domain;
    this.scope = scope;
    this.enventManageTokens.next(true)
    this.sessions.forEach(session => {
      if (session.domain == domain) {
        this.enventSession.next(session);
      }
    })
    this._cd.detectChanges();
  }

  closeManageTokens(): void {
    this.manageTokens = "";
    this.scope = "";
    this.enventManageTokens.next(false)
    this._cd.detectChanges();
  }

  ////////////
  // CREATE TOKENS
  ////////////
  openCreateToken(domain: string, scope: string): void {
    this.createToken = domain;
    this.scope = scope;
    this.enventCreateToken.next(true)
    this.sessions.forEach(session => {
      if (session.domain == domain) {
        this.enventSession.next(session);
      }
    })
    this._cd.detectChanges();
  }

  closeCreateToken(): void {
    this.createToken = "";
    this.scope = "";
    this.enventCreateToken.next(false)
    this._cd.detectChanges();
  }
}
