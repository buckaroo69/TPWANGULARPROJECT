import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {ActivatedRoute} from "@angular/router";
import {formatDate, Location} from "@angular/common";
import {BookFullView} from "../../data/bookFullView";
import {BookService} from "../book.service";
import {Review} from "../../data/review";
import {ChapterService} from "../chapter.service";
import {ChapterPOST} from "../../data/chapterPOST";
import Utils from "../utils";
import {Chapter, ChapterSimple} from "../../data/chapter";
import {Book} from "../../data/book";

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit {
  loggedin:boolean; //allow review
  isauthor:boolean=false; //allow edit
  isadmin:boolean=false; //allow delete
  book!:BookFullView;
  bookId?:number;
  reviews?:Review[];
  page:number=1;
  isEditingBook:boolean=false;
  isCreatingChapter:boolean=false;
  formatDate = Utils.formatDate;
  editableMap: Map<ChapterSimple,boolean> = new Map<ChapterSimple,boolean>();
  isEditingChapter:boolean=false;

  constructor(private auth:UserService,
              private route:ActivatedRoute,
              private location:Location,
              private bookService:BookService,
              private chapterService:ChapterService) {
    this.loggedin = auth.authenticated;
    this.isadmin=auth.userIsStaff;
    auth.authenticatedChange.subscribe(value => this.handleLoginChange(value));
    this.loadBook();
  }

  ngOnInit(): void {
    if (this.loggedin && this.book != undefined) {
      this.isauthor = this.auth.user_id == this.book.book.author
    }
  }

  private handleLoginChange(value: boolean) {
    this.loggedin=value;
    this.isadmin=this.auth.userIsStaff;
    if(!this.loggedin){this.isauthor=false;}
    if(this.loggedin && this.book){this.isauthor = this.auth.user_id==this.book.book.author}
  }

  private loadBook() {
    if (!this.route.snapshot.paramMap.get('pk')){this.location.back();return;} //don't even try if no id
    this.bookId = +this.route.snapshot.paramMap.get('pk')!;
    if (this.route.snapshot.paramMap.get('page')){
      this.page= +this.route.snapshot.paramMap.get('page')!; //defaulted to 1
    }
    this.bookService.getBook(this.bookId!).subscribe(value => {
      this.book=value;
      if (this.page==1) {
        this.reviews = value.reviews
      }
      if (this.loggedin) {
        this.isauthor = this.auth.user_id == this.book.book.author
      }
    });
   if (this.page!=1){
     this.bookService.getReviews(this.bookId,this.page).subscribe(value => this.reviews=value);
   }
    this.route.params.subscribe(params=>{//handle page change
      if(params['page'] && this.page!=params['page']){
        this.page=params['page'];
        this.bookService.getReviews(this.bookId!,this.page).subscribe(value => this.reviews=value);
      }
    })
  }

  public bookmark() {
    this.bookService.bookmark(this.bookId!).subscribe(value => this.book.bookmarked = value.bookmarked);
  }

  public startEditBook() {
    this.isEditingBook = true;
  }

  public stopEditBook() {
    this.isEditingBook = false;
  }

  public deleteBook() {
    this.bookService.deleteBook(this.book.book).subscribe(value => {
      this.location.back()
    });
  }

  public startCreateChapter() {
    this.isCreatingChapter = true;
  }

  public stopCreateChapter() {
    this.isCreatingChapter = false;
  }

  public submitReview(data:{"rating":number, "text": string}) {
    let self_review:Review;
    if (this.book.self_review) {
      self_review = this.book.self_review;
    } else {
      self_review = new Review();
      self_review.novel = this.bookId!;
    }
    self_review.rating = data.rating;
    self_review.text = data.text;
    this.bookService.postReview(self_review, this.book.book).subscribe(value => {
      if (this.book.self_review) {
        let i = this.reviews!.findIndex((review) => {
          return review.author == value.author;
        });
        this.reviews![i] = value;
      } else {
        this.reviews!.unshift(value);
      }
      this.book.self_review = value;
    });
  }

  public deleteReview(review:Review) {
    this.bookService.deleteReview(review.id!).subscribe(value => {
      let i = this.reviews!.findIndex((item) => {
        return item.author == review!.author;
      });
      this.reviews!.splice(i, 1);
      this.book.self_review = undefined;
    });
  }

  public deleteChapter(id:number) {
    this.chapterService.deleteChapter(id).subscribe(value => {
      let i = this.book.chapters.findIndex((chapter) => {
        return chapter.id == id;
      })
      let chapter = this.book.chapters[i]
      this.book.chapters.forEach(item => {
        if (item.number! > chapter.number!) item.number!--;
      })
      this.book.chapters.splice(i, 1);
      if (this.book.lastread! > i) this.book.lastread!--;
      else if (this.book.lastread! == i) this.book.lastread=0;
    });
  }

  toggleEditor(chapter:ChapterSimple){
    this.isEditingChapter = !this.editableMap.get(chapter);
    this.editableMap.set(chapter, this.isEditingChapter);
  }
}
