package main 

import ( 
	"github.com/codegangsta/negroni"
	"github.com/gorilla/websocket"
	"fmt"
	"io/ioutil"
	"net/http"
	"flag"
	"encoding/json"
)

/**
 * Error Handler 
 * @param e error
 */
func checkError(e error) {
	if e != nil {
		panic(e)	
	}
}

/**
 * Http Get
 *  
 * @param url url to request
 * @param onsuccess 
 */
func httpGet(url string, onSuccess func([]byte) ,  onError func(int) )  {
	response ,err := http.Get(url) 
	checkError(err)
	defer response.Body.Close()
	if response.StatusCode == 200 {
		b,err := ioutil.ReadAll(response.Body)
		checkError(err)
		onSuccess(b)
	}else {
		onError(response.StatusCode)
	}
}

/**
 * Main
 */
func main() {

	dockerapi := flag.String("D", "http://localhost:5000", "location for docker registry") 
	port := flag.String("P", ":3000", "http port")

	//websocket setting
	upgrader := websocket.Upgrader {
		ReadBufferSize: 1024,
		WriteBufferSize: 1024,
	}

	//HTTP handler
	mux := http.NewServeMux()

	//Search Images
	mux.HandleFunc("/docker/api/images",func(w http.ResponseWriter , r *http.Request) {
		success := func(b []byte) {w.Write(b)}
		error := func(statusCode int) {w.WriteHeader(statusCode)}
		httpGet(fmt.Sprintf("%s/v1/images/%s/json",*dockerapi,r.URL.Query().Get("id")),success,error)
	})

	//Search Tags
	mux.HandleFunc("/docker/api/repository",func(w http.ResponseWriter , r * http.Request ) {

		//TODO router 
		if r.Method == "DELETE" {
			var url = fmt.Sprintf("%s/v1/repositories/%s/tags%s",*dockerapi,r.URL.Query().Get("repo"),r.URL.Query().Get("tag"));
			client := &http.Client{};
			req, err := http.NewRequest("DELETE", url, nil);
			checkError(err);
			resp, err := client.Do(req)
			checkError(err);
			if resp.StatusCode == 200 {
				w.Write([]byte("{}"));
			}else {
				w.WriteHeader(resp.StatusCode);
			}
			return
		}

		success := func(b []byte) {
			var val map[string]string
			err := json.Unmarshal(b,&val)
			checkError(err)
			tags := make([]Tag,0)
			for k,v := range val {
				s := func(b []byte) {
					var image Image 
					err = json.Unmarshal(b,&image)
					checkError(err)
					tags = append(tags,Tag{Id:k,ImageId:v,Created:image.Created})
				}
				e := func(statusCode int ) {}
				httpGet(fmt.Sprintf("%s/v1/images/%s/json",*dockerapi,v),s,e)
			}
			j,e := json.Marshal(tags)
			checkError(e)
			w.Write(j)
		}
		error := func(statusCode int ) {
			w.WriteHeader(statusCode)
		}
		httpGet(fmt.Sprintf("%s/v1/repositories/%s/tags",*dockerapi,r.URL.Query().Get("id")),success,error)

	})

	//WebSocket
	mux.HandleFunc("/ws",func(w http.ResponseWriter , r *http.Request) {
		conn, err := upgrader.Upgrade(w,r,nil)
		checkError(err)
		for {
			messageType , p , err := conn.ReadMessage()
			checkError(err)

			success := func(b []byte) {
				err = conn.WriteMessage(messageType,b)
				checkError(err)
			}
			error := func(statusCode int) {
				err = conn.WriteMessage(messageType,[]byte("{}"))
				checkError(err)
			}
			httpGet(fmt.Sprintf("%s/v1/search?q=%s",*dockerapi,string(p)),success,error)
		}
	})
	n := negroni.Classic()
	n.UseHandler(mux)
	n.Run(*port)
}

type Tag struct {
     Id string `json:"id"`
     ImageId string  `json:"imageId"`
     Created string  `json:"created"`
}

type Image struct {
   Created string `json:"created"`
}
