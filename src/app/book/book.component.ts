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

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit {
  loggedin:boolean; //allow review
  isauthor:boolean=false; //allow edit
  book!:BookFullView;
  bookId?:number;
  reviews?:Review[];
  page:number=1;
  isEditingBook:boolean=false;
  isCreatingChapter:boolean=false;
  formatDate = Utils.formatDate;

  constructor(private auth:UserService,
              private route:ActivatedRoute,
              private location:Location,
              private bookService:BookService,
              private chapterService:ChapterService) {
    this.loggedin = auth.authenticated;
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

  public editBook(data:{"title":string, "description":string}) {
    this.book.book.title = data.title;
    this.book.book.description = data.description;
    this.bookService.editBook(this.book.book).subscribe(value => {
      this.isEditingBook = false;
    });
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

  public createChapter(data:{"title":string, "text":string}) {
    let newChapter = new ChapterPOST();
    newChapter.title = data.title;
    newChapter.text = data.text;
    newChapter.novel = this.bookId!;
    console.log(data.title)
    console.log(data.text)
    console.log(this.bookId)
    this.chapterService.postChapter(newChapter).subscribe(value => {
      this.isCreatingChapter = false
    })
  }

  public submitReview(data:{"rating":number, "text": string}) {
    let self_review:Review;
    if (this.book.self_review) {
      self_review = this.book.self_review;
    } else {
      self_review = new Review();
      self_review.author = this.auth.user_id!;
      self_review.novel = this.bookId!;
      self_review.author_name = this.auth.user_name!;
      self_review.release = Date.now().toString();
    }
    self_review.rating = data.rating;
    self_review.text = data.text;
    this.bookService.postReview(self_review, this.book.book).subscribe(value => {
      if (this.book.self_review) {
        let i = this.reviews!.findIndex((review) => {
          return review.author == self_review.author;
        });
        this.reviews![i] = self_review;
      } else {
        this.reviews!.push(self_review);
      }
      this.book.self_review = self_review;
    });
  }

  public deleteReview() {
    this.bookService.deleteReview(this.bookId!).subscribe(value => {
      let i = this.reviews!.findIndex((review) => {
        return review.author == this.book.self_review!.author;
      });
      this.reviews!.splice(i, 1);
      this.book.self_review = undefined;
    });
  }
}
